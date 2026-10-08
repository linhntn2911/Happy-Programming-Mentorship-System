package com.happyprogramming.config;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.service.StaffAccessService;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.*;
import jakarta.servlet.http.*;
import java.util.Map;

@Configuration
public class StaffAccessConfig implements WebMvcConfigurer {
    private final StaffAccessService access;
    private final ObjectMapper json;
    public StaffAccessConfig(StaffAccessService access,ObjectMapper json) { this.access=access; this.json=json; }
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            public boolean preHandle(HttpServletRequest request,HttpServletResponse response,Object handler) throws Exception {
                try {
                    var principal=request.getUserPrincipal() instanceof Authentication a && a.getPrincipal() instanceof AuthenticatedUser u ? u : null;
                    var permissions=access.permissions(principal);
                    String path=request.getRequestURI().substring(request.getContextPath().length());
                    String section=path.substring("/api/staff/".length()).split("/")[0];
                    if (section.equals("access") || section.equals("dashboard")) return true;
                    String required=Map.of("mentor-applications","MENTOR_APPLICATION_MANAGE",
                        "mentors","MENTOR_APPLICATION_MANAGE","mentees","MENTEE_MANAGE",
                        "requests","MENTORSHIP_REQUEST_MANAGE","skills","SKILL_MANAGE").get(section);
                    if (required==null || !permissions.contains(required))
                        throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN,"You do not have permission to access this staff function.");
                    return true;
                } catch (ResponseStatusException ex) {
                    response.setStatus(ex.getStatusCode().value());
                    response.setContentType("application/json");
                    json.writeValue(response.getOutputStream(),ApiResponse.error(ex.getReason()));
                    return false;
                }
            }
        }).addPathPatterns("/api/staff/**");
    }
}
