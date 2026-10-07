package com.happyprogramming.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.happyprogramming.dto.*;
import com.happyprogramming.entity.*;
import com.happyprogramming.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;
import java.security.SecureRandom;
import java.net.URI;

@Service
public class MentorApplicationService {
    private final UserRepository users;
    private final MentorApplicationRepository applications;
    private final AuthService auth;
    private final PasswordEncoder passwords;
    private final EmailService mail;
    private final ObjectMapper json;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public MentorApplicationService(UserRepository users, MentorApplicationRepository applications, AuthService auth,
            PasswordEncoder passwords, EmailService mail, ObjectMapper json, Clock clock) {
        this.users=users; this.applications=applications; this.auth=auth;
        this.passwords=passwords; this.mail=mail; this.json=json; this.clock=clock;
    }
    @Transactional(readOnly=true)
    public boolean existingEmail(String email) {
        return users.existsByEmailNormalized(email.trim().toLowerCase(Locale.ROOT));
    }
    @Transactional
    public MentorApplicationResponse submit(MentorSignupRequest request, Long ownerId, boolean loggedIn) {
        User user;
        var now = LocalDateTime.now(clock);
        if (ownerId == null) {
            if (existingEmail(request.email())) throw error(HttpStatus.CONFLICT, "An account already exists. Please log in to apply.");
            auth.validatePasswordPolicy(request.password());
            user = users.saveAndFlush(User.createMentee(request.email(), request.firstName(), request.lastName(),
                passwords.encode(request.password()), now));
        } else {
            user = owner(ownerId, loggedIn);
            if (!user.getEmail().equalsIgnoreCase(request.email().trim()))
                throw error(HttpStatus.BAD_REQUEST, "Use the email address of your current account.");
        }
        if (user.hasRole("MENTOR")) throw error(HttpStatus.CONFLICT, "You are already a mentor.");
        if (!user.hasRole("MENTEE")) throw error(HttpStatus.FORBIDDEN, "Only mentee accounts can apply.");
        var previous = applications.findFirstByApplicantIdOrderByIdDesc(user.getId()).orElse(null);
        if (previous != null && Set.of("PENDING","APPROVED").contains(previous.getStatus()))
            throw error(HttpStatus.CONFLICT, "Your application is already submitted. Check its status.");
        var application = previous != null && "DRAFT".equals(previous.getStatus())
            ? previous : MentorApplication.draft(user.getId(), now);
        checkCooldown(application, now);
        byte[] cv = pdf(request, previous);
        validatePhoto(request.photoDataUrl());
        validateUrl(request.linkedin(), "LinkedIn", true);
        validateUrl(request.website(), "Website", false);
        if (Arrays.stream(request.skills().split(",")).filter(s -> !s.isBlank()).count() > 10)
            throw error(HttpStatus.BAD_REQUEST, "Select at most 10 skills.");
        ObjectNode snapshot = json.valueToTree(request);
        snapshot.remove(List.of("password", "cvBase64"));
        snapshot.put("email", user.getEmail());
        // Existing account identity cannot be changed by the application.
        snapshot.put("firstName", user.getFirstName() == null ? request.firstName() : user.getFirstName());
        snapshot.put("lastName", user.getLastName() == null ? request.lastName() : user.getLastName());
        String fileName = request.cvBase64() == null || request.cvBase64().isBlank()
            ? previous.getCvFileName() : request.cvFileName();
        application.update(request.bio().trim(), request.yearsExperience(), request.experienceSummary().trim(),
            snapshot.toString(), fileName, cv, now);
        issue(application, user, now);
        applications.saveAndFlush(application);
        return response(application, user);
    }
    @Transactional
    public MentorApplicationResponse mine(Long ownerId, boolean loggedIn) {
        if (ownerId == null) return null;
        var user = owner(ownerId, loggedIn);
        return applications.findFirstByApplicantIdOrderByIdDesc(user.getId()).map(a -> response(a,user)).orElse(null);
    }
    public record Verification(MentorApplicationResponse application, AuthenticatedUser user, String error) {}
    /** Restore only the draft capability; OTP is still required for account authentication. */
    @Transactional
    public Long resumeDraft(LoginRequest request) {
        if ((request.role() != null && !"MENTEE".equalsIgnoreCase(request.role())) || request.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72) return null;
        var user=users.findForLogin(request.email().trim().toLowerCase(Locale.ROOT)).orElse(null);
        var now=LocalDateTime.now(clock);
        if (user==null || !"INACTIVE".equals(user.getStatus()) || user.getEmailVerifiedAt()!=null
            || user.getLockedUntil()!=null && user.getLockedUntil().isAfter(now)) return null;
        var a=applications.findFirstByApplicantIdOrderByIdDesc(user.getId()).orElse(null);
        if (a==null || !"DRAFT".equals(a.getStatus())) return null;
        user.resetExpiredLock(now);
        String hash=user.getPasswordHash();
        if (hash!=null && hash.startsWith("{bcrypt}")) hash=hash.substring(8);
        if (hash==null || !passwords.matches(request.password(),hash)) { user.recordFailure(now); return null; }
        user.recordLogin(now);
        return user.getId();
    }
    @Transactional
    public Verification verify(Long ownerId, boolean loggedIn, String code) {
        var user = owner(ownerId, loggedIn);
        var a = draft(user);
        var now = LocalDateTime.now(clock);
        if (a.getOtpHash() == null || a.getOtpExpiresAt() == null || !a.getOtpExpiresAt().isAfter(now) || a.getOtpAttempts() >= 5)
            return new Verification(null,null,"Code expired or attempt limit reached. Request a new code.");
        if (!passwords.matches(code, a.getOtpHash())) {
            a.failOtp();
            return new Verification(null,null,"Invalid verification code.");
        }
        a.submit(now);
        if ("INACTIVE".equals(user.getStatus()) && user.getEmailVerifiedAt() == null) user.activateEmail(now);
        user.recordLogin(now);
        return new Verification(response(a,user), AuthenticatedUser.from(user), null);
    }
    @Transactional
    public MentorApplicationResponse resend(Long ownerId, boolean loggedIn) {
        var user = owner(ownerId, loggedIn);
        var a = draft(user);
        var now = LocalDateTime.now(clock);
        checkCooldown(a, now);
        issue(a,user,now);
        return response(a,user);
    }
    @Transactional(readOnly=true)
    public List<MentorApplicationResponse> queue(Long reviewerId) {
        reviewer(reviewerId);
        return applications.findTop100ByStatusOrderBySubmittedAtAsc("PENDING").stream()
            .map(a -> response(a, users.findById(a.getApplicantId()).orElseThrow())).toList();
    }
    @Transactional
    public MentorApplicationResponse decide(Long reviewerId, Long id, String decision, String reason) {
        reviewer(reviewerId);
        var applicantId = applications.applicantId(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND,"Application not found."));
        if (applicantId.equals(reviewerId)) throw error(HttpStatus.FORBIDDEN,"You cannot review your own application.");
        var user = users.findForLoginById(applicantId).orElseThrow();
        var a = applications.findFirstByApplicantIdOrderByIdDesc(user.getId()).orElseThrow();
        if (!a.getId().equals(id) || !"PENDING".equals(a.getStatus()))
            throw error(HttpStatus.CONFLICT,"This application is no longer pending.");
        if (!"ACTIVE".equals(user.getStatus())) throw error(HttpStatus.CONFLICT,"The applicant account must be active.");
        if ("REJECTED".equals(decision) && (reason == null || reason.isBlank()))
            throw error(HttpStatus.BAD_REQUEST,"A rejection reason is required.");
        if (!Set.of("APPROVED","REJECTED").contains(decision)) throw error(HttpStatus.BAD_REQUEST,"Invalid decision.");
        a.review(decision,reason,reviewerId,LocalDateTime.now(clock));
        if ("APPROVED".equals(decision)) user.approveMentor();
        return response(a,user);
    }
    public record Document(String fileName, byte[] content) {}
    @Transactional(readOnly=true)
    public Document cv(Long reviewerId, Long id) {
        reviewer(reviewerId);
        var a = applications.findById(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND,"Application not found."));
        if (a.getCvContent() == null) throw error(HttpStatus.NOT_FOUND,"No document is available.");
        return new Document(a.getCvFileName(),a.getCvContent());
    }
    private User owner(Long id, boolean loggedIn) {
        if (id == null) throw error(HttpStatus.UNAUTHORIZED,"Please log in or start a new application.");
        var user = users.findForLoginById(id).orElseThrow(() -> error(HttpStatus.UNAUTHORIZED,"Account unavailable."));
        boolean allowed = loggedIn ? "ACTIVE".equals(user.getStatus())
            : "INACTIVE".equals(user.getStatus()) && user.getEmailVerifiedAt() == null && user.hasRole("MENTEE");
        if (!allowed || user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now(clock)))
            throw error(HttpStatus.FORBIDDEN,"This account cannot submit an application.");
        return user;
    }
    private void reviewer(Long id) {
        if (id == null) throw error(HttpStatus.UNAUTHORIZED,"Please log in.");
        var user = users.findById(id).orElseThrow(() -> error(HttpStatus.FORBIDDEN,"Reviewer access required."));
        if (!"ACTIVE".equals(user.getStatus())
            || user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now(clock))
            || !(user.hasRole("ADMIN") || user.hasRole("STAFF") && applications.reviewerPermission(id)>0))
            throw error(HttpStatus.FORBIDDEN,"Mentor application review permission is required.");
    }
    private MentorApplication draft(User user) {
        var a = applications.findFirstByApplicantIdOrderByIdDesc(user.getId())
            .orElseThrow(() -> error(HttpStatus.NOT_FOUND,"Start an application first."));
        if (!"DRAFT".equals(a.getStatus())) throw error(HttpStatus.CONFLICT,"Application already submitted.");
        return a;
    }
    private void checkCooldown(MentorApplication a, LocalDateTime now) {
        if (a.getOtpSentAt()!=null && a.getOtpSentAt().plusSeconds(60).isAfter(now))
            throw error(HttpStatus.TOO_MANY_REQUESTS,"Please wait 60 seconds before requesting another code.");
    }
    private void issue(MentorApplication a, User user, LocalDateTime now) {
        String code = String.format(Locale.ROOT,"%06d",random.nextInt(1000000));
        a.issue(passwords.encode(code),now);
        mail.sendMentorOtpEmail(user.getEmail(),user.getFirstName(),code);
    }
    private byte[] pdf(MentorSignupRequest r, MentorApplication previous) {
        if (r.cvBase64()==null || r.cvBase64().isBlank()) {
            if (previous!=null && previous.getCvContent()!=null) return previous.getCvContent();
            throw error(HttpStatus.BAD_REQUEST,"Upload your PDF CV.");
        }
        byte[] content;
        try { content=Base64.getDecoder().decode(r.cvBase64()); }
        catch (IllegalArgumentException e) { throw error(HttpStatus.BAD_REQUEST,"Invalid PDF upload."); }
        if (content.length<5 || content.length>10*1024*1024
            || !new String(content,0,5,java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-")
            || r.cvFileName()==null || !r.cvFileName().toLowerCase(Locale.ROOT).endsWith(".pdf")
            || r.cvFileName().contains("/") || r.cvFileName().contains("\\") || r.cvFileName().chars().anyMatch(c -> c<32))
            throw error(HttpStatus.BAD_REQUEST,"Upload a PDF no larger than 10 MB with a valid filename.");
        return content;
    }
    private void validateUrl(String value, String field, boolean required) {
        if (value==null || value.isBlank()) {
            if (required) throw error(HttpStatus.BAD_REQUEST,field+" URL is required.");
            return;
        }
        try {
            URI uri=URI.create(value);
            if (!Set.of("http","https").contains(uri.getScheme()) || uri.getHost()==null || uri.getUserInfo()!=null)
                throw new IllegalArgumentException();
            if (field.equals("LinkedIn") && !(uri.getHost().equals("linkedin.com") || uri.getHost().endsWith(".linkedin.com")))
                throw new IllegalArgumentException();
        } catch (IllegalArgumentException e) { throw error(HttpStatus.BAD_REQUEST,"Enter a valid "+field+" URL."); }
    }
    private void validatePhoto(String value) {
        if (value==null || value.isBlank()) return;
        try {
            if (!(value.startsWith("data:image/png;base64,") || value.startsWith("data:image/jpeg;base64,")
                || value.startsWith("data:image/webp;base64,"))) throw new IllegalArgumentException();
            byte[] data=Base64.getDecoder().decode(value.substring(value.indexOf(',')+1));
            if (data.length>2*1024*1024 || data.length<12) throw new IllegalArgumentException();
            boolean png=data[0]==(byte)137 && data[1]==80 && data[2]==78 && data[3]==71;
            boolean jpeg=data[0]==(byte)255 && data[1]==(byte)216 && data[2]==(byte)255;
            boolean webp=new String(data,0,4,java.nio.charset.StandardCharsets.US_ASCII).equals("RIFF")
                && new String(data,8,4,java.nio.charset.StandardCharsets.US_ASCII).equals("WEBP");
            if (!(png && value.startsWith("data:image/png;") || jpeg && value.startsWith("data:image/jpeg;")
                || webp && value.startsWith("data:image/webp;"))) throw new IllegalArgumentException();
        } catch (IllegalArgumentException ex) { throw error(HttpStatus.BAD_REQUEST,"Upload a PNG, JPEG or WebP photo no larger than 2 MB."); }
    }
    private MentorApplicationResponse response(MentorApplication a, User u) {
        try {
            return new MentorApplicationResponse(a.getId(),u.getId(),u.getFullName(),u.getEmail(),a.getStatus(),
                a.getRejectionReason(),json.readTree(a.getProfileSnapshot()),a.getCvFileName(),a.getSubmittedAt(),
                a.getOtpExpiresAt(),a.getOtpSentAt()==null ? null : a.getOtpSentAt().plusSeconds(60));
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) { throw new IllegalStateException("Invalid stored application snapshot",e); }
    }
    private static ResponseStatusException error(HttpStatus status, String message) { return new ResponseStatusException(status,message); }
}
