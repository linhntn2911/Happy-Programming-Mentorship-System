package com.happyprogramming.service;

import com.happyprogramming.dto.AuthenticatedUser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class MentorDisputeServiceTest {

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void login(long id, String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(id, "Dispute Test", "dispute@example.invalid", role),
                null, List.of(() -> "ROLE_" + role)));
    }

    @Test
    void disputeAccessRequiresAnAuthenticatedUser() {
        MentorDisputeService service = new MentorDisputeService(null);

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.list(null));

        assertEquals(401, error.getStatusCode().value());
    }

    @Test
    void menteeCannotUseTheMentorDisputeEndpoints() {
        MentorDisputeService service = new MentorDisputeService(null);
        login(21L, "MENTEE");

        assertEquals(403, assertThrows(ResponseStatusException.class, () -> service.list(null)).getStatusCode().value());
        assertEquals(403, assertThrows(ResponseStatusException.class, () -> service.detail(1L)).getStatusCode().value());
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> service.respond(1L, "Mentor explanation", List.of())).getStatusCode().value());
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> service.downloadEvidence(1L, 1L)).getStatusCode().value());
    }

    @Test
    void unknownStatusFilterIsRejectedBeforeQuerying() {
        MentorDisputeService service = new MentorDisputeService(null);
        login(22L, "MENTOR");

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.list("CLOSED"));

        assertEquals(400, error.getStatusCode().value());
    }

    @Test
    void disputeQueriesFailClosedWhenPersistenceIsUnavailable() {
        MentorDisputeService service = new MentorDisputeService(null);
        login(23L, "MENTOR");

        assertEquals(503, assertThrows(ResponseStatusException.class, () -> service.list("SUBMITTED")).getStatusCode().value());
        assertEquals(503, assertThrows(ResponseStatusException.class, () -> service.detail(5L)).getStatusCode().value());
    }
}
