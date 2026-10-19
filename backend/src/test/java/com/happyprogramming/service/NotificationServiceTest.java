package com.happyprogramming.service;

import com.happyprogramming.entity.Notification;
import com.happyprogramming.repository.NotificationRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 16, 2, 30);

    @Mock NotificationRepository repository;
    NotificationService service;

    @BeforeEach
    void setUp() {
        service = new NotificationService(repository,
                Clock.fixed(Instant.parse("2026-10-16T02:30:00Z"), ZoneOffset.UTC));
    }

    @Test
    void readsOnlyNotificationsBelongingToRequestedMentee() {
        Notification owned = notification(5L, "Booking confirmed");
        when(repository.countByUserIdAndIsReadFalse(5L)).thenReturn(1L);
        when(repository.findTop50ByUserIdOrderByCreatedAtDesc(5L)).thenReturn(List.of(owned));

        var result = service.getUserNotifications(5L);

        assertEquals(1L, result.unreadCount());
        assertEquals(1, result.notifications().size());
        verify(repository).findTop50ByUserIdOrderByCreatedAtDesc(5L);
        verify(repository, never()).findTop50ByUserIdOrderByCreatedAtDesc(99L);
    }

    @Test
    void markAsReadCannotUpdateAnotherUsersNotification() {
        when(repository.findByIdAndUserId(90L, 5L)).thenReturn(Optional.empty());

        assertFalse(service.markAsRead(5L, 90L));
    }

    @Test
    void markAsReadUsesOwnershipLookupAndFixedClock() {
        Notification owned = notification(5L, "Booking confirmed");
        when(repository.findByIdAndUserId(90L, 5L)).thenReturn(Optional.of(owned));

        assertTrue(service.markAsRead(5L, 90L));

        assertTrue(owned.isRead());
        assertEquals(NOW, owned.getReadAt());
    }

    @Test
    void historyAppliesMenteeAndUnreadFilter() {
        when(repository.countByUserIdAndIsReadFalse(5L)).thenReturn(0L);
        when(repository.findByUserIdAndIsReadFalseOrderByCreatedAtDescIdDesc(eq(5L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        var result = service.getHistory(5L, 0, 20, true);

        assertEquals(0, result.notifications().size());
        verify(repository).findByUserIdAndIsReadFalseOrderByCreatedAtDescIdDesc(eq(5L), any(Pageable.class));
    }

    @Test
    void historyRejectsInvalidPageSize() {
        assertEquals(400, assertThrows(ResponseStatusException.class,
                () -> service.getHistory(5L, 0, 51, false)).getStatusCode().value());
    }

    @Test
    void markAllAsReadUpdatesOnlyTheRequestedMentee() {
        when(repository.markAllAsRead(5L, NOW)).thenReturn(3);

        assertEquals(3, service.markAllAsRead(5L));

        verify(repository).markAllAsRead(5L, NOW);
    }

    private static Notification notification(long userId, String title) {
        return new Notification(userId, title, "Message", "BOOKING", "#/bookings", NOW.minusMinutes(5));
    }
}
