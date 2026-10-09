package com.happyprogramming.controller;

import com.happyprogramming.dto.*;
import com.happyprogramming.security.SessionLogin;
import com.happyprogramming.service.AuthService;
import com.happyprogramming.service.DuplicateEmailException;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    private final com.happyprogramming.service.MentorApplicationService mentorApplications;
    private final boolean googleEnabled;
    public AuthController(AuthService auth, ObjectProvider<ClientRegistrationRepository> registrations,
                          com.happyprogramming.service.MentorApplicationService mentorApplications) {
        this.auth = auth;
        this.mentorApplications = mentorApplications;
        this.googleEnabled = registrations.getIfAvailable() != null;
    }

    @GetMapping("/csrf")
    public ApiResponse<?> csrf(CsrfToken csrf) {
        return ApiResponse.ok(Map.of("token", csrf.getToken(), "headerName", csrf.getHeaderName()));
    }
    @GetMapping("/options")
    public ApiResponse<?> options() { return ApiResponse.ok(Map.of("googleEnabled", googleEnabled)); }

    @PostMapping("/signup/mentee")
    public ResponseEntity<?> signupMentee(@Valid @RequestBody MenteeSignupRequest body) {
        var response = auth.signupMentee(body);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response.message(), response));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOtpRequest body, HttpServletRequest req, HttpServletResponse res) {
        var user = auth.verifyOtp(body.email(), body.code());
        SessionLogin.establish(user, req, res);
        return ResponseEntity.ok(ApiResponse.ok("Email verified successfully", user));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@Valid @RequestBody ResendOtpRequest body) {
        auth.resendOtp(body.email());
        return ResponseEntity.ok(ApiResponse.ok("A new verification code has been sent to your email", null));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest body, HttpServletRequest req, HttpServletResponse res) {
        var user = auth.login(body);
        if (user.isEmpty()) {
            var draftOwner=mentorApplications.resumeDraft(body);
            if (draftOwner!=null) {
                SessionLogin.clear(req);
                req.getSession(true).setAttribute("MENTOR_DRAFT_OWNER",draftOwner);
                return ResponseEntity.ok(ApiResponse.ok(Map.of("mentorVerificationRequired",true)));
            }
        }
        if (user.isEmpty()) return ResponseEntity.status(401).body(ApiResponse.error(
            "Unable to log in. Check your email and password. If you have tried repeatedly, wait 15 minutes."));
        SessionLogin.establish(user.get(), req, res);
        return ResponseEntity.ok(ApiResponse.ok(user.get()));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication, HttpServletRequest req) {
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser principal) {
            var user = auth.current(principal);
            if (user.isPresent()) return ResponseEntity.ok(ApiResponse.ok(user.get()));
        }
        // Preserve anonymous draft ownership while /me correctly returns unauthenticated.
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser) SessionLogin.clear(req);
        return ResponseEntity.status(401).body(ApiResponse.error("Please log in to continue."));
    }

    @PostMapping("/google")
    public ResponseEntity<?> google(@Valid @RequestBody RoleRequest body, HttpServletRequest req) {
        if (!googleEnabled) return ResponseEntity.status(503).body(ApiResponse.error("Google login is not available yet. Please use email and password."));
        SessionLogin.clear(req);
        req.getSession(true).setAttribute("GOOGLE_LOGIN_ROLE", body.role());
        if ("mentor".equals(body.returnTo())) req.getSession().setAttribute("GOOGLE_RETURN_MENTOR", true);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("url", "/oauth2/authorization/google")));
    }

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<?> handleDuplicateEmail(DuplicateEmailException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> invalidInput(MethodArgumentNotValidException ex) {
        var firstError = ex.getBindingResult().getFieldErrors().stream()
            .map(f -> f.getField() + ": " + f.getDefaultMessage())
            .findFirst()
            .orElse("Enter valid registration details.");
        return ResponseEntity.badRequest().body(ApiResponse.error(firstError));
    }
}
