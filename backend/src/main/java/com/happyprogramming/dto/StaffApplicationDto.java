package com.happyprogramming.dto;

import java.util.List;

public class StaffApplicationDto {
    private String id;
    private String applicantName;
    private String email;
    private String phone;
    private String specialty;
    private int experienceYears;
    private String submittedDate;
    private String status;
    private String bio;
    private List<String> skills;
    private String cvFileName;
    private String cvFileSize;
    private String linkedinUrl;
    private String githubUrl;
    private String portfolioUrl;
    private String reviewNote;

    public StaffApplicationDto() {}

    public StaffApplicationDto(String id, String applicantName, String email, String phone, String specialty, int experienceYears, String submittedDate, String status, String bio, List<String> skills, String cvFileName, String cvFileSize, String linkedinUrl, String githubUrl, String portfolioUrl, String reviewNote) {
        this.id = id;
        this.applicantName = applicantName;
        this.email = email;
        this.phone = phone;
        this.specialty = specialty;
        this.experienceYears = experienceYears;
        this.submittedDate = submittedDate;
        this.status = status;
        this.bio = bio;
        this.skills = skills;
        this.cvFileName = cvFileName;
        this.cvFileSize = cvFileSize;
        this.linkedinUrl = linkedinUrl;
        this.githubUrl = githubUrl;
        this.portfolioUrl = portfolioUrl;
        this.reviewNote = reviewNote;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getApplicantName() { return applicantName; }
    public void setApplicantName(String applicantName) { this.applicantName = applicantName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getSpecialty() { return specialty; }
    public void setSpecialty(String specialty) { this.specialty = specialty; }

    public int getExperienceYears() { return experienceYears; }
    public void setExperienceYears(int experienceYears) { this.experienceYears = experienceYears; }

    public String getSubmittedDate() { return submittedDate; }
    public void setSubmittedDate(String submittedDate) { this.submittedDate = submittedDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public List<String> getSkills() { return skills; }
    public void setSkills(List<String> skills) { this.skills = skills; }

    public String getCvFileName() { return cvFileName; }
    public void setCvFileName(String cvFileName) { this.cvFileName = cvFileName; }

    public String getCvFileSize() { return cvFileSize; }
    public void setCvFileSize(String cvFileSize) { this.cvFileSize = cvFileSize; }

    public String getLinkedinUrl() { return linkedinUrl; }
    public void setLinkedinUrl(String linkedinUrl) { this.linkedinUrl = linkedinUrl; }

    public String getGithubUrl() { return githubUrl; }
    public void setGithubUrl(String githubUrl) { this.githubUrl = githubUrl; }

    public String getPortfolioUrl() { return portfolioUrl; }
    public void setPortfolioUrl(String portfolioUrl) { this.portfolioUrl = portfolioUrl; }

    public String getReviewNote() { return reviewNote; }
    public void setReviewNote(String reviewNote) { this.reviewNote = reviewNote; }
}
