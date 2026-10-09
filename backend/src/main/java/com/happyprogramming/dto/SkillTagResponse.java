package com.happyprogramming.dto;

public record SkillTagResponse(
        Long id,
        Long categoryId,
        String name,
        String slug,
        String description
) {
}
