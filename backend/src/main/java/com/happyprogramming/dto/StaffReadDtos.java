package com.happyprogramming.dto;

public final class StaffReadDtos {
    public record Skill(long id, String name, String slug, long categoryId, String category, String description, boolean active) {}
    public record SkillCategory(long id, String name, String slug, String description, boolean active, long skillsCount) {
        public SkillCategory(long id, String name, String slug) {
            this(id, name, slug, null, true, 0L);
        }
    }
    public record Request(long id, String mentee, String mentor, String status, String learningGoals, String createdAt) {}
}
