package com.happyprogramming.dto;

public final class StaffReadDtos {
    public record Skill(long id, String name, String slug, long categoryId, String category, String description, boolean active) {}
    public record SkillCategory(long id, String name, String slug) {}
    public record Request(long id, String mentee, String mentor, String status, String learningGoals, String createdAt) {}
}
