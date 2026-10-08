package com.happyprogramming.dto;
public final class StaffReadDtos {
    public record Skill(long id,String name,String category,String description,boolean active) {}
    public record Request(long id,String mentee,String mentor,String status,String learningGoals,String createdAt) {}
}
