package com.happyprogramming.dto;

import java.util.List;

public class StaffMentorDto {
    private String id;
    private String name;
    private String email;
    private String jobTitle;
    private List<String> skills;
    private int experienceYears;
    private String status;
    private String bio;
    private String monthlyPrice;
    private String sessionPrice;
    private String cvUrl;

    public StaffMentorDto() {}

    public StaffMentorDto(String id, String name, String email, String jobTitle, List<String> skills, int experienceYears, String status, String bio, String monthlyPrice, String sessionPrice, String cvUrl) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.jobTitle = jobTitle;
        this.skills = skills;
        this.experienceYears = experienceYears;
        this.status = status;
        this.bio = bio;
        this.monthlyPrice = monthlyPrice;
        this.sessionPrice = sessionPrice;
        this.cvUrl = cvUrl;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getJobTitle() { return jobTitle; }
    public void setJobTitle(String jobTitle) { this.jobTitle = jobTitle; }

    public List<String> getSkills() { return skills; }
    public void setSkills(List<String> skills) { this.skills = skills; }

    public int getExperienceYears() { return experienceYears; }
    public void setExperienceYears(int experienceYears) { this.experienceYears = experienceYears; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public String getMonthlyPrice() { return monthlyPrice; }
    public void setMonthlyPrice(String monthlyPrice) { this.monthlyPrice = monthlyPrice; }

    public String getSessionPrice() { return sessionPrice; }
    public void setSessionPrice(String sessionPrice) { this.sessionPrice = sessionPrice; }

    public String getCvUrl() { return cvUrl; }
    public void setCvUrl(String cvUrl) { this.cvUrl = cvUrl; }
}
