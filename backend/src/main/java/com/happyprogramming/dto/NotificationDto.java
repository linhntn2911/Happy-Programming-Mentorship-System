package com.happyprogramming.dto;

import java.time.LocalDateTime;
import java.util.List;

public record NotificationDto(
    Long id,
    String title,
    String message,
    String type,
    String actionUrl,
    boolean isRead,
    LocalDateTime createdAt
) {
    public record NotificationListResponse(
        long unreadCount,
        List<NotificationDto> notifications
    ) {}
}
