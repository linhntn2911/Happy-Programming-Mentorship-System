package com.happyprogramming.role.mentee;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications", schema = "dbo")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "title", nullable = false, length = 250)
    private String title;

    @Column(name = "message", nullable = false, columnDefinition = "nvarchar(max)")
    private String message;

    @Column(name = "type", nullable = false, length = 50)
    private String type;

    @Column(name = "action_url", length = 255)
    private String actionUrl;

    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    public Notification() {}

    public Notification(Long userId, String title, String message, String type, String actionUrl, LocalDateTime createdAt) {
        this.userId = userId;
        this.title = title;
        this.message = message;
        this.type = type;
        this.actionUrl = actionUrl;
        this.createdAt = createdAt != null ? createdAt : LocalDateTime.now();
        this.isRead = false;
    }

    public void markRead(LocalDateTime now) {
        this.isRead = true;
        this.readAt = now;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getTitle() { return title; }
    public String getMessage() { return message; }
    public String getType() { return type; }
    public String getActionUrl() { return actionUrl; }
    public boolean isRead() { return isRead; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getReadAt() { return readAt; }
}
