package com.happyprogramming.role.staff;

public class StaffActivityDto {
    private String id;
    private String type;
    private String title;
    private String description;
    private String status;
    private String timeAgo;

    public StaffActivityDto() {}

    public StaffActivityDto(String id, String type, String title, String description, String status, String timeAgo) {
        this.id = id;
        this.type = type;
        this.title = title;
        this.description = description;
        this.status = status;
        this.timeAgo = timeAgo;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTimeAgo() {
        return timeAgo;
    }

    public void setTimeAgo(String timeAgo) {
        this.timeAgo = timeAgo;
    }
}
