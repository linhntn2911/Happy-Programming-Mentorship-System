package com.happyprogramming.role.mentor;

import com.happyprogramming.role.auth.AuthService;
import com.happyprogramming.role.auth.EmailService;

import com.fasterxml.jackson.databind.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real SQL Server repositories, rolled-back fixtures; only outbound email is mocked. */
@SpringBootTest @AutoConfigureMockMvc @Transactional
class MentorApplicationControllerTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate db;
    @Autowired ObjectMapper json;
    @Autowired PasswordEncoder passwords;
    @Autowired EntityManager em;
    @Autowired AuthService auth;
    @MockitoBean EmailService mail;
    String email;
    String password = "Application!Password42";
    AtomicReference<String> code = new AtomicReference<>();

    @BeforeEach void setup() {
        email="application-"+UUID.randomUUID()+"@example.invalid";
        doAnswer(invocation -> { code.set(invocation.getArgument(2)); return null; })
            .when(mail).sendMentorOtpEmail(anyString(),nullable(String.class),anyString());
    }
    Map<String,Object> form(String email) {
        var form=new LinkedHashMap<String,Object>();
        form.put("firstName","Test"); form.put("lastName","Applicant"); form.put("email",email); form.put("password",password);
        form.put("jobTitle","Software Engineer"); form.put("company","Test"); form.put("location","Vietnam");
        form.put("category","Backend Development"); form.put("skills","Java,SQL");
        form.put("bio","I help developers learn Java and build maintainable software through thoughtful mentoring.");
        form.put("linkedin","https://www.linkedin.com/in/test-applicant");
        form.put("yearsExperience",5); form.put("experienceSummary","Five years building software and supporting developers.");
        form.put("cvFileName","resume.pdf");
        form.put("acceptedTerms",true);
        form.put("cvBase64",Base64.getEncoder().encodeToString("%PDF-1.4\n%%EOF".getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        return form;
    }
    ResultActions postJson(String path, MockHttpSession session, Object body) throws Exception {
        return mvc.perform(post(path).session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)));
    }
    JsonNode data(MvcResult result) throws Exception { return json.readTree(result.getResponse().getContentAsString()).path("data"); }
    void flush() { em.flush(); em.clear(); }
    long account(String address, String role) {
        db.update("INSERT INTO dbo.users(email,full_name,first_name,last_name,role_code,status,password_hash) VALUES (?, 'Test Applicant','Test','Applicant',?,'ACTIVE',?)",
            address,role,passwords.encode(password));
        return db.queryForObject("SELECT id FROM dbo.users WHERE email=?",Long.class,address);
    }
    MockHttpSession login(String address, String role) throws Exception {
        var session=new MockHttpSession();
        postJson("/api/auth/login",session,Map.of("email",address,"password",password,"role",role)).andExpect(status().isOk());
        return session;
    }
    long draft(MockHttpSession session) throws Exception {
        return data(postJson("/api/mentor-applications",session,form(email)).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("DRAFT")).andReturn()).path("id").asLong();
    }
    void verify(MockHttpSession session) throws Exception {
        postJson("/api/mentor-applications/verify",session,Map.of("code",code.get())).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("PENDING"));
        flush();
    }
    @Test void anonymousOtpApprovalPreservesBothRolesAndPrivateDocument() throws Exception {
        var applicant=new MockHttpSession();
        long id=draft(applicant);
        flush();
        assertEquals("DRAFT",db.queryForObject("SELECT status FROM dbo.mentor_applications WHERE id=?",String.class,id));
        assertNotNull(db.queryForObject("SELECT cv_content FROM dbo.mentor_applications WHERE id=?",byte[].class,id));
        postJson("/api/mentor-applications/verify",new MockHttpSession(),Map.of("code",code.get())).andExpect(status().isUnauthorized());
        verify(applicant);
        postJson("/api/mentor-applications/verify",applicant,Map.of("code",code.get())).andExpect(status().isConflict());
        postJson("/api/mentor-applications",applicant,form(email)).andExpect(status().isConflict());
        postJson("/api/auth/login",new MockHttpSession(),Map.of("email",email,"password",password,"role","MENTOR")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/staff/mentor-applications/"+id+"/cv").session(applicant)).andExpect(status().isForbidden());
        String admin="admin-"+UUID.randomUUID()+"@example.invalid";
        account(admin,"ADMIN");
        var reviewer=login(admin,"ADMIN");
        mvc.perform(get("/api/staff/mentor-applications/"+id+"/cv").session(reviewer)).andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PDF));
        postJson("/api/staff/mentor-applications/"+id+"/decision",reviewer,Map.of("decision","APPROVED"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("APPROVED"));
        flush();
        login(email,"MENTEE"); login(email,"MENTOR");
        mvc.perform(get("/api/auth/me").session(applicant)).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.roles",org.hamcrest.Matchers.hasItems("MENTEE","MENTOR")));
        postJson("/api/staff/mentor-applications/"+id+"/decision",reviewer,Map.of("decision","APPROVED")).andExpect(status().isConflict());
    }
    @Test void existingMenteeMustLoginAndCannotChangeAccountEmail() throws Exception {
        long owner=account(email,"MENTEE");
        postJson("/api/mentor-applications/check-email",new MockHttpSession(),Map.of("email",email.toUpperCase(Locale.ROOT)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.loginRequired").value(true));
        postJson("/api/mentor-applications",new MockHttpSession(),form(email)).andExpect(status().isConflict());
        var session=login(email,"MENTEE");
        postJson("/api/mentor-applications",session,form("other@example.invalid")).andExpect(status().isBadRequest());
        var fields=form(email); fields.remove("password");
        postJson("/api/mentor-applications",session,fields).andExpect(status().isOk());
        verify(session);
        assertEquals(owner,db.queryForObject("SELECT applicant_id FROM dbo.mentor_applications WHERE applicant_id=?",Long.class,owner));
        assertEquals(1,db.queryForObject("SELECT COUNT(*) FROM dbo.users WHERE email=?",Integer.class,email));
    }
    @Test void otpCooldownAttemptLimitExpiryAndResendAreEnforced() throws Exception {
        var session=new MockHttpSession(); long id=draft(session);
        postJson("/api/mentor-applications/resend",session,Map.of()).andExpect(status().isTooManyRequests());
        String wrong=code.get().equals("000000") ? "111111" : "000000";
        for(int i=0;i<5;i++) postJson("/api/mentor-applications/verify",session,Map.of("code",wrong)).andExpect(status().isBadRequest());
        flush();
        assertEquals(5,db.queryForObject("SELECT otp_attempts FROM dbo.mentor_applications WHERE id=?",Integer.class,id));
        postJson("/api/mentor-applications/verify",session,Map.of("code",code.get())).andExpect(status().isBadRequest());
        db.update("UPDATE dbo.mentor_applications SET otp_sent_at=DATEADD(minute,-2,SYSUTCDATETIME()) WHERE id=?",id);
        em.clear();
        postJson("/api/mentor-applications/resend",session,Map.of()).andExpect(status().isOk());
        flush();
        db.update("UPDATE dbo.mentor_applications SET otp_expires_at=DATEADD(minute,-1,SYSUTCDATETIME()) WHERE id=?",id);
        em.clear();
        postJson("/api/mentor-applications/verify",session,Map.of("code",code.get())).andExpect(status().isBadRequest());
    }
    @Test void staffPermissionAndRejectionResubmissionAreEnforced() throws Exception {
        var applicant=new MockHttpSession();long id=draft(applicant);verify(applicant);
        String staffEmail="staff-"+UUID.randomUUID()+"@example.invalid";
        long staffId=account(staffEmail,"STAFF");
        var staff=login(staffEmail,"STAFF");
        mvc.perform(get("/api/staff/mentor-applications").session(staff)).andExpect(status().isForbidden());
        long adminId=account("permission-admin-"+UUID.randomUUID()+"@example.invalid","ADMIN");
        db.update("INSERT INTO dbo.user_permissions(user_id,permission_code,assigned_by) VALUES (?,'MENTOR_APPLICATION_MANAGE',?)",staffId,adminId);
        postJson("/api/staff/mentor-applications/"+id+"/decision",staff,Map.of("decision","REJECTED")).andExpect(status().isBadRequest());
        postJson("/api/staff/mentor-applications/"+id+"/decision",staff,Map.of("decision","REJECTED","reason","Please clarify your experience."))
            .andExpect(status().isOk());
        flush();
        mvc.perform(get("/api/mentor-applications/mine").session(applicant)).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.rejectionReason").value("Please clarify your experience."));
        long replacement=draft(applicant);
        assertNotEquals(id,replacement);
        verify(applicant);
        assertEquals("REJECTED",db.queryForObject("SELECT status FROM dbo.mentor_applications WHERE id=?",String.class,id));
        assertEquals(1,db.queryForObject("SELECT COUNT(*) FROM dbo.mentor_applications WHERE applicant_id=(SELECT id FROM dbo.users WHERE email=?) AND status='PENDING'",Integer.class,email));
    }
    @Test void mailFailureIsNotReportedAsSubmissionSuccessAndInvalidPdfIsRejected() throws Exception {
        var session=new MockHttpSession();
        var fields=form(email); fields.put("cvBase64",Base64.getEncoder().encodeToString("not a PDF".getBytes()));
        postJson("/api/mentor-applications",session,fields).andExpect(status().isBadRequest());
        doThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Mail unavailable"))
            .when(mail).sendMentorOtpEmail(anyString(),nullable(String.class),anyString());
        // Different email because this test itself owns the surrounding rollback transaction.
        postJson("/api/mentor-applications",session,form("mail-"+email)).andExpect(status().isServiceUnavailable());
        assertNull(session.getAttribute("MENTOR_DRAFT_OWNER"));
    }
    @Test void googleCannotProvisionOrUpgradeAMentor() {
        assertTrue(auth.google("subject-"+UUID.randomUUID(),email,"Test Applicant","Test","Applicant","MENTOR").isEmpty());
        assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM dbo.users WHERE email=?",Integer.class,email));
        account(email,"MENTEE");
        assertTrue(auth.google("subject-"+UUID.randomUUID(),email,"Test Applicant","Test","Applicant","MENTOR").isEmpty());
    }
    @Test void passwordCanResumeDraftButCannotAuthenticateBeforeOtp() throws Exception {
        var initial=new MockHttpSession(); draft(initial);
        flush();
        var resumed=new MockHttpSession();
        var loginResult=postJson("/api/auth/login",resumed,Map.of("email",email,"password",password,"role","MENTEE"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.mentorVerificationRequired").value(true)).andReturn();
        resumed=(MockHttpSession)loginResult.getRequest().getSession(false);
        mvc.perform(get("/api/auth/me").session(resumed)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/mentor-applications/mine").session(resumed)).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("DRAFT"));
        verify(resumed);
    }
    @Test void selfReviewAndRevokedReviewerAreDenied() throws Exception {
        var applicant=new MockHttpSession(); long id=draft(applicant);verify(applicant);
        long applicantId=db.queryForObject("SELECT id FROM dbo.users WHERE email=?",Long.class,email);
        db.update("INSERT INTO dbo.user_roles(user_id,role_code) VALUES (?,'ADMIN')",applicantId);
        em.clear();
        postJson("/api/staff/mentor-applications/"+id+"/decision",applicant,Map.of("decision","APPROVED")).andExpect(status().isForbidden());
        db.update("DELETE FROM dbo.user_roles WHERE user_id=? AND role_code='ADMIN'",applicantId);
        em.clear();
        mvc.perform(get("/api/staff/mentor-applications").session(applicant)).andExpect(status().isForbidden());
    }
}
