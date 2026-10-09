package com.happyprogramming.dto;
import jakarta.validation.constraints.*;
public final class ProfileDtos {
    private ProfileDtos() {}
    public record Update(
        @NotBlank @Size(max=75) String firstName,
        @NotBlank @Size(max=75) String lastName,
        @Size(max=1000) String bio,
        @Pattern(regexp="BEGINNER|FRESHER|JUNIOR|MID|SENIOR|^$") String experienceLevel,
        @Size(max=2000) String learningGoals,
        @Size(max=500) String githubUrl,
        @Size(max=500) String portfolioUrl) {}
    public record Avatar(@NotBlank @Size(max=2796204) String base64) {}
    public record Profile(String firstName, String lastName, String email, String bio,
        String experienceLevel, String learningGoals, String githubUrl, String portfolioUrl, boolean hasAvatar) {}
}
