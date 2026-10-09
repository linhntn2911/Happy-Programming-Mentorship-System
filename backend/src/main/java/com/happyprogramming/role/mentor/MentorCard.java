package com.happyprogramming.role.mentor;

import java.util.List;

public record MentorCard(
    String id,
    String name,
    String initials,
    String role,
    String company,
    String specialty,
    String experience,
    int yearsExperience,
    String accent,
    List<String> skills,
    List<String> languages,
    String country,
    String monthly,
    long monthlyPrice,
    String session,
    double rating,
    int reviewCount,
    boolean acceptingMentees,
    String description,
    String portrait
) {}
