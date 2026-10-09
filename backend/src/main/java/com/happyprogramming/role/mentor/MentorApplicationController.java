package com.happyprogramming.role.mentor;

import com.happyprogramming.role.auth.AuthenticatedUser;
import com.happyprogramming.role.mentor.MentorSignupRequest;
import com.happyprogramming.role.shared.ApiResponse;

import com.happyprogramming.security.SessionLogin;
import com.happyprogramming.role.mentor.MentorApplicationService;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestController
public class MentorApplicationController {
    private static final String DRAFT_OWNER = "MENTOR_DRAFT_OWNER";
    private final MentorApplicationService service;
    public MentorApplicationController(MentorApplicationService service) { this.service=service; }
    public record EmailCheck(@NotBlank @Email @Size(max=254) String email) {}
    public record Code(@NotBlank @Pattern(regexp="[0-9]{6}") String code) {}
    public record Decision(@NotBlank @Pattern(regexp="APPROVED|REJECTED") String decision, @Size(max=1000) String reason) {}
    private Long signedIn(Authentication auth) {
        return auth!=null && auth.getPrincipal() instanceof AuthenticatedUser u ? u.id() : null;
    }
    private Long owner(Authentication auth, HttpServletRequest request) {
        Long id=signedIn(auth);
        return id!=null ? id : request.getSession(false)==null ? null : (Long)request.getSession(false).getAttribute(DRAFT_OWNER);
    }
    @PostMapping("/api/mentor-applications/check-email")
    public ApiResponse<?> check(@Valid @RequestBody EmailCheck body) {
        return ApiResponse.ok(Map.of("loginRequired", service.existingEmail(body.email())));
    }
    @PostMapping({"/api/mentor-applications","/api/auth/signup/mentor"})
    public ApiResponse<?> submit(@Valid @RequestBody MentorSignupRequest body, Authentication auth, HttpServletRequest req) {
        var result=service.submit(body,owner(auth,req),signedIn(auth)!=null);
        if (signedIn(auth)==null) {
            req.getSession(true).setAttribute(DRAFT_OWNER,result.applicantId());
            req.changeSessionId();
        }
        return ApiResponse.ok(result);
    }
    @GetMapping("/api/mentor-applications/mine")
    public ApiResponse<?> mine(Authentication auth, HttpServletRequest req) {
        return ApiResponse.ok(service.mine(owner(auth,req),signedIn(auth)!=null));
    }
    @PostMapping("/api/mentor-applications/verify")
    public ResponseEntity<?> verify(@Valid @RequestBody Code body, Authentication auth, HttpServletRequest req, HttpServletResponse res) {
        var result=service.verify(owner(auth,req),signedIn(auth)!=null,body.code());
        if (result.error()!=null) return ResponseEntity.badRequest().body(ApiResponse.error(result.error()));
        SessionLogin.establish(result.user(),req,res);
        req.getSession().removeAttribute(DRAFT_OWNER);
        return ResponseEntity.ok(ApiResponse.ok(result.application()));
    }
    @PostMapping("/api/mentor-applications/resend")
    public ApiResponse<?> resend(Authentication auth, HttpServletRequest req) {
        return ApiResponse.ok(service.resend(owner(auth,req),signedIn(auth)!=null));
    }
    @GetMapping("/api/staff/mentor-applications")
    public ApiResponse<?> queue(Authentication auth) { return ApiResponse.ok(service.queue(signedIn(auth))); }
    @PostMapping("/api/staff/mentor-applications/{id}/decision")
    public ApiResponse<?> decide(@PathVariable Long id, @Valid @RequestBody Decision body, Authentication auth) {
        return ApiResponse.ok(service.decide(signedIn(auth),id,body.decision(),body.reason()));
    }
    @GetMapping("/api/staff/mentor-applications/{id}/cv")
    public ResponseEntity<byte[]> cv(@PathVariable Long id, Authentication auth) {
        var doc=service.cv(signedIn(auth),id);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(doc.fileName(),java.nio.charset.StandardCharsets.UTF_8).build().toString())
            .header("X-Content-Type-Options","nosniff").cacheControl(CacheControl.noStore()).body(doc.content());
    }
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> failure(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode()).body(ApiResponse.error(ex.getReason()));
    }
    @ExceptionHandler({MethodArgumentNotValidException.class, IllegalArgumentException.class})
    public ResponseEntity<?> invalid(Exception ex) {
        return ResponseEntity.badRequest().body(ApiResponse.error(ex instanceof MethodArgumentNotValidException
            ? "Check the required application fields and upload size." : ex.getMessage()));
    }
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<?> duplicate() {
        return ResponseEntity.status(409).body(ApiResponse.error("An account or application already exists. Please log in and check your status."));
    }
}
