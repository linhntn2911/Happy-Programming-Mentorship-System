package com.happyprogramming.service;
import com.happyprogramming.dto.MentorCard;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;

@Service
public class MentorCatalog {
    private final JdbcTemplate jdbcTemplate;

    public MentorCatalog() {
        this(null);
    }

    @Autowired
    public MentorCatalog(@Autowired(required = false) JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }
    private static final List<MentorCard> MENTORS = List.of(
            new MentorCard("minh-an", "Minh An Nguyen", "MA", "Senior Backend Engineer", "FPT Software", "Backend", "6 years of experience", 6, "purple", List.of("Java", "Spring Boot", "SQL Server"), List.of("Vietnamese", "English"), "Vietnam", "2,500,000", 2500000, "500,000", 0.0, 0, true, "Build a solid Java foundation, design better APIs, and turn your Spring Boot project into work you are proud to share.", "mentor-1.jpg"),
            new MentorCard("thao-linh", "Thao Linh Tran", "TL", "Senior Frontend Developer", "NashTech", "Frontend", "5 years of experience", 5, "peach", List.of("React", "TypeScript", "Tailwind CSS"), List.of("Vietnamese", "English"), "Vietnam", "1,800,000", 1800000, "400,000", 0.0, 0, true, "Go from your first component to a thoughtful web experience with practical feedback on React, accessibility, and your portfolio.", "mentor-2.jpg"),
            new MentorCard("hoang-nam", "Hoang Nam Le", "HN", "AI & Data Engineer", "VNG", "AI & Data", "7 years of experience", 7, "green", List.of("Python", "Machine Learning", "SQL"), List.of("Vietnamese", "English"), "Vietnam", "2,800,000", 2800000, "600,000", 0.0, 0, true, "Make sense of your data, understand your models, and build a machine learning project with a clear purpose and a realistic plan.", "mentor-3.jpg"),
            new MentorCard("david-pham", "David Pham", "DP", "Full-stack Developer", "Grab", "Full-stack", "8 years of experience", 8, "purple", List.of("JavaScript", "React", "Node.js"), List.of("English", "Vietnamese"), "Singapore", "2,400,000", 2400000, "500,000", 0.0, 0, true, "Connect frontend and backend with confidence. Work through architecture decisions and get hands-on feedback on your full-stack app.", "mentor-4.jpg"),
            new MentorCard("sofia-tran", "Sofia Tran", "ST", "Software Engineer", "KMS Technology", "Backend", "5 years of experience", 5, "peach", List.of("Java", "System Design", "SQL"), List.of("English", "Vietnamese"), "United States", "2,200,000", 2200000, "450,000", 0.0, 0, true, "Strengthen your problem-solving skills, understand system design, and learn to explain the reasoning behind your technical decisions.", "mentor-5.jpg"),
            new MentorCard("alex-nguyen", "Alex Nguyen", "AN", "DevOps Engineer", "Tiki", "DevOps", "6 years of experience", 6, "green", List.of("Docker", "CI/CD", "Cloud"), List.of("Vietnamese", "English"), "Vietnam", "2,600,000", 2600000, "550,000", 0.0, 0, true, "Take your project from a local setup to a reliable deployment. Learn containers, delivery pipelines, and practical cloud fundamentals.", "mentor-6.jpg")
    );


    public List<MentorCard> featuredMentors() {
        return allMentors();
    }

    public List<MentorCard> allMentors() {
        if (jdbcTemplate == null) {
            return MENTORS;
        }
        try {
            Map<Long, List<String>> skillsByMentor = new HashMap<>();
            jdbcTemplate.query(
                "SELECT ms.mentor_id, s.name FROM dbo.mentor_skills ms " +
                "JOIN dbo.skills s ON s.id = ms.skill_id WHERE s.is_active = 1 " +
                "ORDER BY ms.mentor_id, ms.display_order, s.name",
                rs -> {
                    long mId = rs.getLong("mentor_id");
                    String sName = rs.getString("name");
                    skillsByMentor.computeIfAbsent(mId, k -> new ArrayList<>()).add(sName);
                }
            );

            List<MentorCard> dbMentors = jdbcTemplate.query(
                "SELECT mp.user_id, mp.slug, u.full_name, mp.headline, mp.job_title, " +
                "mp.company_name, mp.biography, mp.years_experience, mp.accepting_mentees, f.id AS avatar_id, " +
                "COALESCE(rv.rating, 0) AS rating, COALESCE(rv.review_count, 0) AS review_count " +
                "FROM dbo.mentor_profiles mp " +
                "JOIN dbo.users u ON u.id = mp.user_id " +
                "LEFT JOIN dbo.files f ON f.id = u.avatar_file_id AND f.uploaded_by = u.id AND f.status = 'READY' AND f.avatar_content IS NOT NULL AND f.storage_key LIKE 'profile-avatar/%' " +
                "LEFT JOIN (SELECT COALESCE(b.mentor_id, s.mentor_id) AS mentor_id, AVG(CAST(r.rating AS DECIMAL(4,2))) AS rating, COUNT(*) AS review_count " +
                "FROM dbo.reviews r LEFT JOIN dbo.bookings b ON b.id = r.booking_id LEFT JOIN dbo.subscriptions s ON s.id = r.subscription_id " +
                "WHERE r.visibility_status = 'PUBLISHED' GROUP BY COALESCE(b.mentor_id, s.mentor_id)) rv ON rv.mentor_id = mp.user_id " +
                "WHERE mp.is_public = 1 AND u.status = 'ACTIVE'",
                (rs, rowNum) -> {
                    long userId = rs.getLong("user_id");
                    String slug = rs.getString("slug");
                    String fullName = rs.getString("full_name");
                    String jobTitle = rs.getString("job_title");
                    String company = rs.getString("company_name");
                    String bio = rs.getString("biography");
                    BigDecimal yrs = rs.getBigDecimal("years_experience");
                    boolean accepting = rs.getBoolean("accepting_mentees");

                    int yearsExp = yrs != null ? yrs.intValue() : 1;
                    List<String> mentorSkills = skillsByMentor.getOrDefault(userId, List.of());
                    if (mentorSkills.isEmpty()) {
                        mentorSkills = List.of("Software Engineering");
                    }
                    String id = slug != null && !slug.isBlank() ? slug : "mentor-" + userId;
                    String role = jobTitle != null && !jobTitle.isBlank() ? jobTitle : "Software Engineer";
                    String companyName = company != null && !company.isBlank() ? company : "Tech";
                    String initials = getInitials(fullName);
                    String specialty = !mentorSkills.isEmpty() ? mentorSkills.get(0) : "Backend";
                    String portrait = rs.getObject("avatar_id") == null ? null : "/api/mentors/" + java.net.URLEncoder.encode(id, java.nio.charset.StandardCharsets.UTF_8) + "/avatar";

                    return new MentorCard(
                        id,
                        fullName,
                        initials,
                        role,
                        companyName,
                        specialty,
                        yearsExp + " years of experience",
                        yearsExp,
                        "purple",
                        mentorSkills,
                        List.of("Vietnamese", "English"),
                        "Vietnam",
                        "2,000,000",
                        2000000L,
                        "400,000",
                        rs.getDouble("rating"),
                        rs.getInt("review_count"),
                        accepting,
                        bio != null ? bio : "Professional mentor.",
                        portrait
                    );
                }
            );

            if (dbMentors.isEmpty()) {
                return MENTORS;
            }

            Map<String, MentorCard> map = new LinkedHashMap<>();
            for (MentorCard m : MENTORS) {
                map.put(m.id(), m);
            }
            for (MentorCard m : dbMentors) {
                map.putIfAbsent(m.id(), m);
            }
            return new ArrayList<>(map.values());
        } catch (Exception ex) {
            return MENTORS;
        }
    }

    public byte[] avatar(String slug) {
        var images = jdbcTemplate.query("SELECT f.avatar_content FROM dbo.mentor_profiles mp JOIN dbo.users u ON u.id=mp.user_id JOIN dbo.files f ON f.id=u.avatar_file_id WHERE mp.slug=? AND mp.is_public=1 AND u.status='ACTIVE' AND f.uploaded_by=u.id AND f.status='READY' AND f.storage_key LIKE 'profile-avatar/%' AND f.avatar_content IS NOT NULL", (rs, row) -> rs.getBytes(1), slug);
        if (images.isEmpty()) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Avatar unavailable");
        return images.get(0);
    }

    private static String getInitials(String name) {
        if (name == null || name.isBlank()) return "MP";
        String[] parts = name.trim().split("\\s+");
        if (parts.length == 1) return parts[0].substring(0, Math.min(2, parts[0].length())).toUpperCase(Locale.ROOT);
        return ("" + parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase(Locale.ROOT);
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

        return allMentors().stream()
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
