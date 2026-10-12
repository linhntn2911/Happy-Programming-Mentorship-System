package com.happyprogramming.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
}

