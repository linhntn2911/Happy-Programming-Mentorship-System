package com.happyprogramming.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class SkillDtos {
    public record CreateSkillRequest(
        @NotBlank(message = "Skill name is required")
        @Size(max = 100, message = "Skill name must not exceed 100 characters")
        String name,

        @NotNull(message = "Skill category is required")
        Long categoryId,

        @Size(max = 500, message = "Description must not exceed 500 characters")
        String description,

        Boolean active
    ) {}

    public record UpdateSkillRequest(
        @NotBlank(message = "Skill name is required")
        @Size(max = 100, message = "Skill name must not exceed 100 characters")
        String name,

        @NotNull(message = "Skill category is required")
        Long categoryId,

        @Size(max = 500, message = "Description must not exceed 500 characters")
        String description,

        Boolean active
    ) {}

    public record ToggleSkillStatusRequest(
        Boolean active
    ) {}
}
