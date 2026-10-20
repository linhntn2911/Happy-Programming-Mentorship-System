package com.happyprogramming.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;

import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.SendWorkspaceMessageRequest;
import com.happyprogramming.repository.MentorshipWorkspaceRepository;
import com.happyprogramming.repository.MentorshipWorkspaceRepository.MessageRow;
import com.happyprogramming.repository.MentorshipWorkspaceRepository.OneOffBookingRow;
import com.happyprogramming.repository.MentorshipWorkspaceRepository.WorkspaceRow;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class MentorshipWorkspaceServiceTest {
    @Mock MentorshipWorkspaceRepository repository;
    MentorshipWorkspaceService service;

    @BeforeEach
    void setUp() {
        service = new MentorshipWorkspaceService(repository);
        var user = new AuthenticatedUser(10L, "Mentee", "mentee@example.com", "MENTEE");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, List.of()));
    }

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    // 27. getWorkspace_01
    @Test
    void listsOnlyRowsReturnedForCurrentMember() {
        when(repository.findForUser(10L)).thenReturn(List.of(workspace()));
        when(repository.countUnread(40L, 10L)).thenReturn(2L);

        var rows = service.listMine();

        assertEquals(1, rows.size());
        assertEquals(20L, rows.get(0).partnerId());
        assertEquals("Mentor", rows.get(0).partnerName());
        assertEquals("MENTEE", rows.get(0).currentUserRole());
        assertEquals(2L, rows.get(0).unreadCount());
    }

    // 28. getWorkspace_02
    @Test
    void rejectsAnAuthenticatedNonMember() {
        when(repository.findAccessibleByConversationId(40L)).thenReturn(Optional.of(workspace()));
        var other = new AuthenticatedUser(99L, "Other", "other@example.com", "MENTEE");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(other, null, List.of()));

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.get(40L));

        assertEquals(403, error.getStatusCode().value());
        verify(repository, never()).findLatestMessages(40L, 100);
    }

    @Test
    void rejectsMessageFromAnAuthenticatedNonMember() {
        when(repository.findAccessibleByConversationId(40L)).thenReturn(Optional.of(workspace()));
        var other = new AuthenticatedUser(99L, "Other", "other@example.com", "MENTEE");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(other, null, List.of()));

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.send(40L,
                new SendWorkspaceMessageRequest("client-2", "TEXT", "Hello", null)));

        assertEquals(403, error.getStatusCode().value());
        verify(repository, never()).insertMessage(eq(40L), eq(99L), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void blocksWorkspaceUntilConversationIsProvisioned() {
        WorkspaceRow pending = new WorkspaceRow(
                40L, 30L, 5L, 20L, "Mentor", 10L, "Mentee", "Standard", "ACTIVE",
                Instant.parse("2026-10-12T00:00:00Z"), Instant.parse("2026-11-12T00:00:00Z"),
                4, 60, "Learn Spring Boot", "PENDING", true, 0, 0, null);
        when(repository.findAccessibleByConversationId(40L)).thenReturn(Optional.of(pending));

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.get(40L));

        assertEquals(409, error.getStatusCode().value());
        verify(repository, never()).findLatestMessages(40L, 100);
    }

    // 29. workspaceMessages_01
    @Test
    void repeatedClientKeyReturnsExistingMessageWithoutAnotherInsert() {
        MessageRow existing = new MessageRow(7L, 10L, "Mentee", "TEXT", "Hello", null,
                Instant.parse("2026-10-12T05:00:00Z"), "client-1", null, null, null, null);
        when(repository.findAccessibleByConversationId(40L)).thenReturn(Optional.of(workspace()));
        when(repository.findBySenderAndClientKey(10L, "client-1")).thenReturn(Optional.of(existing));

        var result = service.send(40L,
                new SendWorkspaceMessageRequest("client-1", "TEXT", "Hello", null));

        assertEquals(7L, result.id());
        verify(repository, never()).insertMessage(40L, 10L, "client-1", "TEXT", "Hello", null);
    }

    // 30. workspaceMessages_02
    @Test
    void uploadsSupportedFileIntoTheMemberConversation() {
        var upload = new MockMultipartFile("file", "lesson.pdf", "application/pdf", "pdf".getBytes());
        MessageRow stored = new MessageRow(8L, 10L, "Mentee", "FILE", "lesson.pdf", null,
                Instant.parse("2026-10-12T05:00:00Z"), "file-1", 50L,
                "lesson.pdf", "application/pdf", 3L);
        when(repository.findAccessibleByConversationId(40L)).thenReturn(Optional.of(workspace()));
        when(repository.findBySenderAndClientKey(10L, "file-1")).thenReturn(Optional.empty());
        when(repository.insertFileMessage(eq(40L), eq(10L), eq("file-1"), eq("lesson.pdf"),
                eq("application/pdf"), eq("pdf".getBytes()), anyString())).thenReturn(stored);

        var result = service.upload(40L, "file-1", upload);

        assertEquals("FILE", result.messageType());
        assertEquals("lesson.pdf", result.fileName());
        assertEquals(50L, result.fileId());
    }

    // 31. workspaceMessages_03
    @Test
    void rejectsExecutableWorkspaceFile() {
        var upload = new MockMultipartFile("file", "run.exe", "application/x-msdownload", new byte[] {1});
        when(repository.findAccessibleByConversationId(40L)).thenReturn(Optional.of(workspace()));
        when(repository.findBySenderAndClientKey(10L, "file-1")).thenReturn(Optional.empty());

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.upload(40L, "file-1", upload));

        assertEquals(400, error.getStatusCode().value());
        verify(repository, never()).insertFileMessage(eq(40L), eq(10L), anyString(), anyString(),
                anyString(), org.mockito.ArgumentMatchers.any(), anyString());
    }

    // 32. workspaceMessages_04
    @Test
    void marksOnlyTheCurrentMembersConversationAsRead() {
        when(repository.findAccessibleByConversationId(40L)).thenReturn(Optional.of(workspace()));

        service.markRead(40L);

        verify(repository).markRead(40L, 10L, false);
    }

    // 33. getEngagements_01
    @Test
    void returnsMonthlyAndOneOffEngagementsInsideOneConversationWorkspace() {
        when(repository.findAccessibleByConversationId(40L)).thenReturn(Optional.of(workspace()));
        when(repository.findLatestMessages(40L, 100)).thenReturn(List.of());
        when(repository.findOneOffBookings(40L)).thenReturn(List.of(new OneOffBookingRow(
                70L, "ONEOFF-125-1", 8L, "Work Review", "Review repository",
                Instant.parse("2026-10-20T10:00:00Z"), Instant.parse("2026-10-20T10:30:00Z"),
                new java.math.BigDecimal("180000"), "VND", "CONFIRMED", 2)));

        var detail = service.get(40L);

        assertEquals(40L, detail.workspaceId());
        assertEquals(30L, detail.subscriptionId());
        assertEquals(1, detail.oneOffSessions().size());
        assertEquals("Work Review", detail.oneOffSessions().get(0).sessionName());
    }

    private static WorkspaceRow workspace() {
        return new WorkspaceRow(
                40L, 30L, 5L,
                20L, "Mentor", 10L, "Mentee",
                "Standard", "ACTIVE",
                Instant.parse("2026-10-12T00:00:00Z"),
                Instant.parse("2026-11-12T00:00:00Z"),
                4, 60, "Learn Spring Boot", "APPROVED",
                true, 1, 1, Instant.parse("2026-10-20T10:00:00Z"));
    }
}
