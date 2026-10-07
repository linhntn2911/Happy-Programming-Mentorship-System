package com.happyprogramming.service;

import com.happyprogramming.dto.MentorCard;

import java.util.List;
import java.util.Comparator;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class MentorCatalog {
    private static final List<MentorCard> MENTORS = List.of(
            new MentorCard("minh-an", "Minh An Nguyen", "MA", "Senior Backend Engineer", "FPT Software", "Backend", "6 years of experience", 6, "purple", List.of("Java", "Spring Boot", "SQL Server"), List.of("Vietnamese", "English"), "Vietnam", "2,500,000", 2500000, "500,000", 4.9, 38, true, "Build a solid Java foundation, design better APIs, and turn your Spring Boot project into work you are proud to share.", "mentor-1.jpg"),
            new MentorCard("thao-linh", "Thao Linh Tran", "TL", "Senior Frontend Developer", "NashTech", "Frontend", "5 years of experience", 5, "peach", List.of("React", "TypeScript", "Tailwind CSS"), List.of("Vietnamese", "English"), "Vietnam", "1,800,000", 1800000, "400,000", 4.8, 24, true, "Go from your first component to a thoughtful web experience with practical feedback on React, accessibility, and your portfolio.", "mentor-2.jpg"),
            new MentorCard("hoang-nam", "Hoang Nam Le", "HN", "AI & Data Engineer", "VNG", "AI & Data", "7 years of experience", 7, "green", List.of("Python", "Machine Learning", "SQL"), List.of("Vietnamese", "English"), "Vietnam", "2,800,000", 2800000, "600,000", 5.0, 31, true, "Make sense of your data, understand your models, and build a machine learning project with a clear purpose and a realistic plan.", "mentor-3.jpg"),
            new MentorCard("david-pham", "David Pham", "DP", "Full-stack Developer", "Grab", "Full-stack", "8 years of experience", 8, "purple", List.of("JavaScript", "React", "Node.js"), List.of("English", "Vietnamese"), "Singapore", "2,400,000", 2400000, "500,000", 4.7, 19, false, "Connect frontend and backend with confidence. Work through architecture decisions and get hands-on feedback on your full-stack app.", "mentor-4.jpg"),
            new MentorCard("sofia-tran", "Sofia Tran", "ST", "Software Engineer", "KMS Technology", "Backend", "5 years of experience", 5, "peach", List.of("Java", "System Design", "SQL"), List.of("English", "Vietnamese"), "United States", "2,200,000", 2200000, "450,000", 4.9, 27, true, "Strengthen your problem-solving skills, understand system design, and learn to explain the reasoning behind your technical decisions.", "mentor-5.jpg"),
            new MentorCard("alex-nguyen", "Alex Nguyen", "AN", "DevOps Engineer", "Tiki", "DevOps", "6 years of experience", 6, "green", List.of("Docker", "CI/CD", "Cloud"), List.of("Vietnamese", "English"), "Vietnam", "2,600,000", 2600000, "550,000", 4.6, 16, true, "Take your project from a local setup to a reliable deployment. Learn containers, delivery pipelines, and practical cloud fundamentals.", "mentor-6.jpg")
        );

    public List<MentorCard> featuredMentors() {
        return MENTORS;
    }

    public List<MentorCard> search(String query, List<String> skills, List<String> jobTitles,
                                   List<String> companies, List<String> languages, List<String> countries,
                                   Integer minExperience, Long minPrice, Long maxPrice,
                                   Double minRating, Boolean available, String sort) {
        String normalizedQuery = normalize(query);
        List<String> normalizedSkills = skills == null ? List.of() : skills.stream()
                .map(MentorCatalog::normalize).filter(value -> !value.isBlank()).toList();

        Comparator<MentorCard> comparator = switch (sort == null ? "recommended" : sort) {
            case "rating" -> Comparator.comparingDouble(MentorCard::rating).reversed();
            case "experience" -> Comparator.comparingInt(MentorCard::yearsExperience).reversed();
            case "price-low" -> Comparator.comparingLong(MentorCard::monthlyPrice);
            case "price-high" -> Comparator.comparingLong(MentorCard::monthlyPrice).reversed();
            default -> Comparator.comparing(MentorCard::acceptingMentees).reversed()
                    .thenComparing(Comparator.comparingDouble(MentorCard::rating).reversed());
        };

        return MENTORS.stream()
                .filter(mentor -> normalizedQuery.isBlank() || searchableText(mentor).contains(normalizedQuery))
                .filter(mentor -> normalizedSkills.isEmpty() || normalizedSkills.stream().allMatch(skill ->
                        mentor.skills().stream().map(MentorCatalog::normalize).anyMatch(value -> value.equals(skill))))
                .filter(mentor -> matchesOne(jobTitles, mentor.role()))
                .filter(mentor -> matchesOne(companies, mentor.company()))
                .filter(mentor -> languages == null || languages.isEmpty() || languages.stream().anyMatch(language ->
                        mentor.languages().stream().anyMatch(value -> normalize(value).equals(normalize(language)))))
                .filter(mentor -> matchesOne(countries, mentor.country()))
                .filter(mentor -> minExperience == null || mentor.yearsExperience() >= minExperience)
                .filter(mentor -> minPrice == null || mentor.monthlyPrice() >= minPrice)
                .filter(mentor -> maxPrice == null || mentor.monthlyPrice() <= maxPrice)
                .filter(mentor -> minRating == null || mentor.rating() >= minRating)
                .filter(mentor -> available == null || !available || mentor.acceptingMentees())
                .sorted(comparator)
                .toList();
    }

    private static String searchableText(MentorCard mentor) {
        return normalize(String.join(" ", mentor.name(), mentor.company(), mentor.role(),
                mentor.specialty(), String.join(" ", mentor.skills())));
    }

    private static String normalize(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT).trim();
    }

    private static boolean matchesOne(List<String> selected, String value) {
        return selected == null || selected.isEmpty() || selected.stream()
                .anyMatch(item -> normalize(item).equals(normalize(value)));
    }
}
