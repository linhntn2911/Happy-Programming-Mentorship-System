package com.happyprogramming.dto;

import java.math.BigDecimal;
import java.util.List;

public record MentorProfileResponse(
        Long userId,
        String fullName,
        String biography,
        BigDecimal yearsExperience,
        String githubUrl,
        String linkedinUrl,
        String portfolioUrl,
        List<MentorSkillResponse> skills
) {
}
