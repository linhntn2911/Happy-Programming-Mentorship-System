package com.happyprogramming.role.mentor;

import java.math.BigDecimal;

public record MentorSkillResponse(
        SkillTagResponse skill,
        BigDecimal yearsExperience,
        boolean verified,
        int displayOrder
) {
}
