package com.happyprogramming.role.mentee;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateMentorshipRequest(
        @NotBlank @Size(max = 100) String mentorSlug,
        @NotBlank @Size(min = 50, max = 4000) String learningGoals,
        @NotBlank @Pattern(regexp = "BEGINNER|JUNIOR|MID|SENIOR") String experienceLevel,
        @Size(max = 2000) String background,
        @Size(max = 2000) String expectations,
        @NotBlank @Size(max = 50) String termsVersion
) {
}
