package com.happyprogramming.service;

import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.RefundDecisionRequest;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class DisputeServiceTest {
    private final JdbcTemplate jdbc = new JdbcTemplate();
    private final DisputeService service = new DisputeService(jdbc);

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void refusesNonMenteeBeforeReadingDisputeData() {
        authenticate("MENTOR");
        ResponseStatusException error = assertThrows(ResponseStatusException.class, service::mine);
        assertEquals(403, error.getStatusCode().value());
    }

    @Test
    void requiresAtLeastOneEvidenceImage() {
        authenticate("MENTEE");
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.submit(
                "ONE_OFF", 7L, "NO_SHOW",
                "The mentor did not provide a link or answer during the scheduled session.", true, List.of()));
        assertEquals(400, error.getStatusCode().value());
    }

    @Test
    void rejectsFileWhoseBytesDoNotMatchImageExtension() {
        authenticate("MENTEE");
        var fake = new MockMultipartFile("evidence", "waiting-room.png", "image/png", "not an image".getBytes());
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.submit(
                "ONE_OFF", 7L, "NO_SHOW",
                "The mentor did not provide a link or answer during the scheduled session.", true, List.of(fake)));
        assertEquals(400, error.getStatusCode().value());
    }

    @Test
    void rejectsTargetSpecificCategoryMismatch() {
        authenticate("MENTEE");
        var png = new MockMultipartFile("evidence", "chat.png", "image/png",
                new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a});
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.submit(
                "MONTHLY", 11L, "NO_SHOW",
                "The mentor did not provide the agreed mentorship support during the trial.", true, List.of(png)));
        assertEquals(400, error.getStatusCode().value());
    }

    @Test
    void refusesNonMenteeBeforeResolvingTargetByRequestId() {
        authenticate("MENTOR");
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.targetByRequestId(99L));
        assertEquals(403, error.getStatusCode().value());
    }

    @Test
    void adminDecideRefund_refusesNonAdminUser() {
        var staffUser = new AuthenticatedUser(2L, "Staff", "staff@example.test", "STAFF");
        var req = new RefundDecisionRequest("PAID", "REF123", null, null, null, null);
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () ->
                service.adminDecideRefund(1L, req, staffUser, "127.0.0.1"));
        assertEquals(403, error.getStatusCode().value());
    }

    @Test
    void adminDecideRefund_requiresTransferReferenceForPaid() {
        var adminUser = new AuthenticatedUser(1L, "Admin", "admin@example.test", "ADMIN");
        var req = new RefundDecisionRequest("PAID", "   ", null, null, null, null);
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () ->
                service.adminDecideRefund(1L, req, adminUser, "127.0.0.1"));
        assertEquals(400, error.getStatusCode().value());
    }

    private void authenticate(String role) {
        var user = new AuthenticatedUser(5L, "User", "user@example.test", role);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, List.of()));
    }
}
