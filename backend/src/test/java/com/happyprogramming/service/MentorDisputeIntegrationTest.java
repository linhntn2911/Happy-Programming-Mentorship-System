package com.happyprogramming.service;

import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.MentorDisputeDetail;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
        "hpms.wallet.release.enabled=false",
        "hpms.wallet.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="})
@Transactional
class MentorDisputeIntegrationTest {
    private static final String MENTEE_PROOF = "Mentee proof: waiting room log without the mentor.";

    @Autowired JdbcTemplate db;
    @Autowired MentorDisputeService disputes;

    long mentor, otherMentor, mentee, disputeId, evidenceId;

    void login(long id, String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(id, "Dispute Test", "dispute@example.invalid", role), null, List.of(() -> "ROLE_" + role)));
    }

    long user(String role) {
        String email = UUID.randomUUID() + "@example.invalid";
        db.update("INSERT INTO dbo.users(email,full_name,role_code,status) VALUES (?,'Dispute Test',?,'ACTIVE')", email, role);
        return db.queryForObject("SELECT id FROM dbo.users WHERE email=?", Long.class, email);
    }

    long mentorProfile(long userId, String slug) {
        db.update("""
                INSERT INTO dbo.mentor_profiles(user_id,slug,headline,job_title,biography,years_experience,is_public)
                VALUES (?,?,'Test','Engineer','Dispute integration test mentor biography covering reliable backend engineering.',5,0)
                """, userId, slug);
        return userId;
    }

    @BeforeEach
    void setup() {
        mentor = mentorProfile(user("MENTOR"), "dispute-" + UUID.randomUUID());
        otherMentor = mentorProfile(user("MENTOR"), "dispute-" + UUID.randomUUID());
        mentee = user("MENTEE");

        long offering = db.queryForObject("""
                INSERT INTO dbo.service_offerings(mentor_id,name,service_type,description,price,session_duration_minutes,status)
                OUTPUT INSERTED.id VALUES (?,'Dispute one-off','ONE_OFF','Consultation used by the dispute test',300000,60,'ACTIVE')
                """, Long.class, mentor);
        long booking = db.queryForObject("""
                INSERT INTO dbo.bookings(booking_code,service_id,mentor_id,mentee_id,service_type,booking_type,
                    start_at,end_at,price_snapshot,currency,terms_snapshot,status,completed_at,meeting_sync_status)
                OUTPUT INSERTED.id VALUES (?,?,?,?,'ONE_OFF','ONE_OFF',
                    DATEADD(DAY,-5,SYSUTCDATETIME()),DATEADD(MINUTE,60,DATEADD(DAY,-5,SYSUTCDATETIME())),
                    300000,'VND',N'{}','COMPLETED',DATEADD(DAY,-5,SYSUTCDATETIME()),'PENDING')
                """, Long.class, "DISPUTE-" + UUID.randomUUID(), offering, mentor, mentee);

        disputeId = db.queryForObject("""
                INSERT INTO dbo.disputes(booking_id,complainant_id,respondent_id,reason_code,description,status)
                OUTPUT INSERTED.id VALUES (?,?,?,'NO_SHOW',?,'SUBMITTED')
                """, Long.class, booking, mentee, mentor,
                "Mentor never joined the booked session and did not answer messages.");

        long fileId = db.queryForObject("""
                INSERT INTO dbo.files(uploaded_by,original_name,storage_key,mime_type,size_bytes,file_content,visibility,status)
                OUTPUT INSERTED.id VALUES (?,?,?,'text/plain',?,?,'AUTHORIZED','READY')
                """, Long.class, mentee, "waiting-room-log.txt", "disputes/test/" + UUID.randomUUID(),
                MENTEE_PROOF.getBytes(StandardCharsets.UTF_8).length, MENTEE_PROOF.getBytes(StandardCharsets.UTF_8));
        evidenceId = db.queryForObject("""
                INSERT INTO dbo.dispute_evidence(dispute_id,file_id,uploaded_by,uploaded_side)
                OUTPUT INSERTED.id VALUES (?,?,?,'MENTEE')
                """, Long.class, disputeId, fileId, mentee);
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void mentorSeesOnlyTheirOwnDisputesAndCanFilterByStatus() {
        login(mentor, "MENTOR");
        var all = disputes.list(null);
        assertEquals(1, all.size());
        assertEquals("SUBMITTED", all.get(0).status());
        assertEquals("BOOKING", all.get(0).targetType());
        assertTrue(all.get(0).targetLabel().startsWith("Session DISPUTE-"));
        assertFalse(all.get(0).responded());

        assertEquals(1, disputes.list("submitted").size());
        assertTrue(disputes.list("RESOLVED").isEmpty());

        login(otherMentor, "MENTOR");
        assertTrue(disputes.list(null).isEmpty());
    }

    @Test
    void detailShowsTheComplaintAndMenteeEvidence() {
        login(mentor, "MENTOR");

        MentorDisputeDetail detail = disputes.detail(disputeId);

        assertEquals("NO_SHOW", detail.reasonCode());
        assertEquals(1, detail.evidence().size());
        assertEquals("waiting-room-log.txt", detail.evidence().get(0).fileName());
        assertEquals("MENTEE", detail.evidence().get(0).uploadedSide());
        assertTrue(detail.responses().isEmpty());
    }

    @Test
    void mentorCanRespondWithAnExplanationAndAttachment() {
        login(mentor, "MENTOR");
        MockMultipartFile proof = new MockMultipartFile("files", "mentor-log.txt", "text/plain",
                "Mentor proof: emergency notification email.".getBytes(StandardCharsets.UTF_8));

        MentorDisputeDetail detail = disputes.respond(disputeId,
                "I had a family emergency and emailed the mentee before the session started.", List.of(proof));

        assertTrue(detail.responded());
        assertEquals(1, detail.responses().size());
        assertEquals("MENTOR", detail.responses().get(0).authorSide());
        assertEquals(1, detail.responses().get(0).evidence().size());
        assertEquals("mentor-log.txt", detail.responses().get(0).evidence().get(0).fileName());
        assertEquals("SUBMITTED", detail.status());
        assertEquals(1, db.queryForObject(
                "SELECT COUNT(*) FROM dbo.dispute_responses WHERE dispute_id=? AND author_side='MENTOR'",
                Integer.class, disputeId).intValue());

        long uploadedEvidence = db.queryForObject(
                "SELECT id FROM dbo.dispute_evidence WHERE dispute_id=? AND uploaded_side='MENTOR'", Long.class, disputeId);
        var download = disputes.downloadEvidence(disputeId, uploadedEvidence);
        assertEquals("mentor-log.txt", download.fileName());
        assertArrayEquals("Mentor proof: emergency notification email.".getBytes(StandardCharsets.UTF_8), download.content());
    }

    @Test
    void mentorCanDownloadTheComplaintEvidence() {
        login(mentor, "MENTOR");

        var download = disputes.downloadEvidence(disputeId, evidenceId);

        assertEquals("waiting-room-log.txt", download.fileName());
        assertEquals("text/plain", download.mimeType());
        assertArrayEquals(MENTEE_PROOF.getBytes(StandardCharsets.UTF_8), download.content());
    }

    @Test
    void anotherMentorCannotReadOrAnswerTheDispute() {
        login(otherMentor, "MENTOR");

        assertEquals(403, assertThrows(ResponseStatusException.class, () -> disputes.detail(disputeId)).getStatusCode().value());
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> disputes.respond(disputeId, "Not my dispute but let me explain anyway.", List.of())).getStatusCode().value());
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> disputes.downloadEvidence(disputeId, evidenceId)).getStatusCode().value());
    }

    @Test
    void aResolvedDisputeNoLongerAcceptsMentorResponses() {
        long resolver = user("STAFF");
        db.update("""
                UPDATE dbo.disputes SET status='RESOLVED',resolution='FULL_REFUND',
                    resolution_note='Staff approved the refund.',resolved_by=?,resolved_at=SYSUTCDATETIME(),updated_at=SYSUTCDATETIME()
                WHERE id=?
                """, resolver, disputeId);
        login(mentor, "MENTOR");

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> disputes.respond(disputeId, "Adding an explanation after the decision.", List.of()));

        assertEquals(409, error.getStatusCode().value());
        assertEquals("RESOLVED", disputes.detail(disputeId).status());
        assertEquals("FULL_REFUND", disputes.detail(disputeId).resolution());
    }

    @Test
    void respondingNeverChangesTheDisputeDecision() {
        login(mentor, "MENTOR");

        disputes.respond(disputeId, "I already refunded the mentee directly, please close this case.", List.of());

        assertEquals("SUBMITTED", db.queryForObject("SELECT status FROM dbo.disputes WHERE id=?", String.class, disputeId));
        assertEquals(0, db.queryForObject("""
                SELECT COUNT(*) FROM dbo.disputes
                WHERE id=? AND (resolution IS NOT NULL OR resolved_by IS NOT NULL OR refund_id IS NOT NULL OR resolved_at IS NOT NULL)
                """, Integer.class, disputeId).intValue());
    }

    @Test
    void unsupportedEvidenceTypesAreRejected() {
        login(mentor, "MENTOR");
        MockMultipartFile executable = new MockMultipartFile("files", "payload.exe", "application/octet-stream", new byte[] {1});

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> disputes.respond(disputeId, "Attaching an executable is not allowed.", List.of(executable)));

        assertEquals(400, error.getStatusCode().value());
        assertEquals(0, db.queryForObject("SELECT COUNT(*) FROM dbo.dispute_responses WHERE dispute_id=?",
                Integer.class, disputeId).intValue());
    }
}
