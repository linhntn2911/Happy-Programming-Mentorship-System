package com.happyprogramming.config;

import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.service.AuthService;


import com.fasterxml.jackson.databind.ObjectMapper;
import com.happyprogramming.security.SessionLogin;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.SecurityFilterChain;
import java.time.Clock;

@Configuration
public class SecurityConfig {
    @Bean Clock authClock() { return Clock.systemUTC(); }
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }

    @Bean
    SecurityFilterChain security(HttpSecurity http, ObjectMapper json, AuthService auth,
                                 ObjectProvider<ClientRegistrationRepository> registrations,
                                 @Value("${hpms.frontend.base-url:http://localhost:5173}") String frontendBaseUrl) throws Exception {
        http.authorizeHttpRequests(r -> r
            .requestMatchers(HttpMethod.GET, "/", "/error", "/api/mentors", "/api/mentors/**", "/api/auth/csrf", "/api/auth/options").permitAll()
            .requestMatchers("/api/auth/login", "/api/auth/signup/**", "/api/auth/verify-otp", "/api/auth/resend-otp", "/api/auth/google", "/oauth2/**", "/login/oauth2/**").permitAll()
            .requestMatchers("/api/mentor-applications", "/api/mentor-applications/check-email",
                "/api/mentor-applications/mine", "/api/mentor-applications/verify", "/api/mentor-applications/resend").permitAll()
            .requestMatchers("/api/admin/**").hasRole("ADMIN")
            .anyRequest().authenticated());
        http.formLogin(f -> f.disable()).httpBasic(b -> b.disable());
        http.requestCache(c -> c.disable());
        http.exceptionHandling(e -> e
            .authenticationEntryPoint((req, res, ex) -> {
                res.setStatus(401); res.setContentType("application/json");
                json.writeValue(res.getOutputStream(), ApiResponse.error("Please log in to continue."));
            })
            .accessDeniedHandler((req, res, ex) -> {
                res.setStatus(403); res.setContentType("application/json");
                json.writeValue(res.getOutputStream(), ApiResponse.error("Your session could not be verified. Refresh and try again."));
            }));
        // Keep Spring's default session-backed CSRF protection, including login/logout.
        http.logout(l -> l.logoutUrl("/api/auth/logout").deleteCookies("JSESSIONID")
            .logoutSuccessHandler((req, res, a) -> {
                res.setContentType("application/json");
                json.writeValue(res.getOutputStream(), ApiResponse.ok("Logged out", null));
            }));
        if (registrations.getIfAvailable() != null) {
            http.oauth2Login(o -> o
                .successHandler((req, res, authentication) -> {
                    var session = req.getSession(false);
                    String role = session == null ? null : (String) session.getAttribute("GOOGLE_LOGIN_ROLE");
                    boolean returnMentor = session != null && Boolean.TRUE.equals(session.getAttribute("GOOGLE_RETURN_MENTOR"));
                    if (session != null) session.removeAttribute("GOOGLE_RETURN_MENTOR");
                    if (session != null) session.removeAttribute("GOOGLE_LOGIN_ROLE");
                    var oidc = authentication.getPrincipal() instanceof OidcUser u ? u : null;
                    var user = oidc != null && Boolean.TRUE.equals(oidc.getEmailVerified())
                        ? auth.google(oidc.getSubject(), oidc.getEmail(), oidc.getFullName(), oidc.getGivenName(), oidc.getFamilyName(), role)
                        : java.util.Optional.<com.happyprogramming.dto.AuthenticatedUser>empty();
                    String redirectTarget = (frontendBaseUrl != null && !frontendBaseUrl.isBlank()) ? frontendBaseUrl : "";
                    if (user.isPresent()) {
                        SessionLogin.establish(user.get(), req, res);
                        res.sendRedirect(redirectTarget + (returnMentor ? "/#/apply/mentor" : "/#/"));
                    } else {
                        SessionLogin.clear(req);
                        res.sendRedirect(redirectTarget + "/#/login?error=google");
                    }
                })
                .failureHandler((req, res, ex) -> {
                    SessionLogin.clear(req);
                    String redirectTarget = (frontendBaseUrl != null && !frontendBaseUrl.isBlank()) ? frontendBaseUrl : "";
                    res.sendRedirect(redirectTarget + "/#/login?error=google");
                }));
        }
        return http.build();
    }
}
