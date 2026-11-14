package com.happyprogramming.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;
import java.util.List;

public record NotificationDto(
    Long id,
    String title,
    String message,
    String type,
    String actionUrl,
    @JsonProperty("isRead") boolean isRead,
    LocalDateTime createdAt
) {
    @JsonProperty("read")
    public boolean read() {
        return isRead;
    }

    public record NotificationListResponse(
        long unreadCount,
        List<NotificationDto> notifications
    ) {}
    public record NotificationHistoryResponse(
        long unreadCount,
        long totalElements,
        int totalPages,
        int page,
        int size,
        List<NotificationDto> notifications
    ) {}
}
