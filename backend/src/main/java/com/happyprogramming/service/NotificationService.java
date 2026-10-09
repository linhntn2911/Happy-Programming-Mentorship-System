package com.happyprogramming.service;

import com.happyprogramming.dto.NotificationDto;
import com.happyprogramming.entity.Notification;
import com.happyprogramming.repository.NotificationRepository;

import com.happyprogramming.dto.NotificationDto.NotificationListResponse;
import com.happyprogramming.dto.NotificationDto.NotificationHistoryResponse;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notifications;
    private final Clock clock;

    public NotificationService(NotificationRepository notifications, Clock clock) {
        this.notifications = notifications;
        this.clock = clock;
    }

    @Transactional
    public NotificationDto create(Long userId, String title, String message, String type, String actionUrl) {
        if (userId == null) return null;
        var entity = new Notification(userId, title, message, type, actionUrl, LocalDateTime.now(clock));
        var saved = notifications.save(entity);
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public NotificationListResponse getUserNotifications(Long userId) {
        if (userId == null) return new NotificationListResponse(0, List.of());
        long unread = notifications.countByUserIdAndIsReadFalse(userId);
        List<NotificationDto> items = notifications.findTop50ByUserIdOrderByCreatedAtDesc(userId)
            .stream().map(this::toDto).toList();
        return new NotificationListResponse(unread, items);
    }

    @Transactional(readOnly = true)
    public NotificationHistoryResponse getHistory(Long userId, int page, int size, boolean unreadOnly) {
        if (page < 0 || size < 1 || size > 50) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid notification page or size.");
        }
        long unread = notifications.countByUserIdAndIsReadFalse(userId);
        var pageable = PageRequest.of(page, size);
        var result = unreadOnly
            ? notifications.findByUserIdAndIsReadFalseOrderByCreatedAtDescIdDesc(userId, pageable)
            : notifications.findByUserIdOrderByCreatedAtDescIdDesc(userId, pageable);
        return new NotificationHistoryResponse(unread, result.getTotalElements(), result.getTotalPages(),
            page, size, result.getContent().stream().map(this::toDto).toList());
    }

    @Transactional
    public boolean markAsRead(Long userId, Long notificationId) {
        if (userId == null || notificationId == null) return false;
        var notif = notifications.findByIdAndUserId(notificationId, userId);
        if (notif.isPresent()) {
            notif.get().markRead(LocalDateTime.now(clock));
            return true;
        }
        return false;
    }

    @Transactional
    public int markAllAsRead(Long userId) {
        if (userId == null) return 0;
        return notifications.markAllAsRead(userId, LocalDateTime.now(clock));
    }

    private NotificationDto toDto(Notification n) {
        return new NotificationDto(
            n.getId(),
            n.getTitle(),
            n.getMessage(),
            n.getType(),
            n.getActionUrl(),
            n.isRead(),
            n.getCreatedAt()
        );
    }
}
