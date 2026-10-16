package com.happyprogramming.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeFalse;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class MentorshipWorkspaceRepositoryIntegrationTest {
    @Autowired MentorshipWorkspaceRepository repository;
    @Autowired JdbcTemplate jdbc;

    @Test
    void countsAndMarksUnreadMessagesForOnlyTheSelectedMember() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT TOP 1 c.id AS conversation_id, c.mentor_id, c.mentee_id
                FROM dbo.conversations c
                JOIN dbo.subscriptions s ON s.mentor_id = c.mentor_id AND s.mentee_id = c.mentee_id
                WHERE c.inquiry_status = 'APPROVED' AND s.status IN ('TRIALING','ACTIVE')
                ORDER BY c.id
                """);
        assumeFalse(rows.isEmpty(), "Requires one settled monthly mentorship.");
        Map<String, Object> row = rows.get(0);
        long conversationId = ((Number) row.get("conversation_id")).longValue();
        long mentorId = ((Number) row.get("mentor_id")).longValue();
        long menteeId = ((Number) row.get("mentee_id")).longValue();

        repository.markRead(conversationId, mentorId, true);
        repository.insertMessage(conversationId, menteeId, "unread-test-" + UUID.randomUUID(),
                "TEXT", "Unread integration test", null);

        assertEquals(1L, repository.countUnread(conversationId, mentorId));
        repository.markRead(conversationId, mentorId, true);
        assertEquals(0L, repository.countUnread(conversationId, mentorId));
    }

    @Test
    void returnsOneConversationWorkspaceAndIncludesItsPaidOneOffBookings() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT TOP 1 c.id AS conversation_id, c.mentee_id
                FROM dbo.conversations c
                JOIN dbo.bookings b
                  ON b.mentor_id = c.mentor_id AND b.mentee_id = c.mentee_id
                WHERE c.inquiry_status = 'APPROVED'
                  AND b.service_type = 'ONE_OFF'
                  AND b.status IN ('CONFIRMED','COMPLETED','NO_SHOW_REVIEW','NO_SHOW')
                ORDER BY c.id
                """);
        assumeFalse(rows.isEmpty(), "Requires one verified one-off booking.");
        long conversationId = ((Number) rows.get(0).get("conversation_id")).longValue();
        long menteeId = ((Number) rows.get(0).get("mentee_id")).longValue();

        var workspaces = repository.findForUser(menteeId);

        assertEquals(1L, workspaces.stream()
                .filter(row -> row.conversationId() == conversationId)
                .count());
        var workspace = workspaces.stream()
                .filter(row -> row.conversationId() == conversationId)
                .findFirst().orElseThrow();
        assertTrue(workspace.oneOffSessionCount() > 0);
        assertFalse(repository.findOneOffBookings(conversationId).isEmpty());
    }
}

