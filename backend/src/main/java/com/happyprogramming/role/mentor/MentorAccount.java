package com.happyprogramming.role.mentor;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "users", schema = "dbo")
public class MentorAccount {
    @Id
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(name = "bio", length = 1000)
    private String bio;

    @Column(name = "github_url", length = 500)
    private String githubUrl;

    @Column(name = "linkedin_url", length = 500)
    private String linkedinUrl;

    @Column(name = "portfolio_url", length = 500)
    private String portfolioUrl;

    @Column(name = "role_code", nullable = false, length = 20)
    private String roleCode;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected MentorAccount() {
    }

    @PreUpdate
    protected void beforeUpdate() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public Long getId() {
        return id;
    }

    void setId(Long id) {
        this.id = id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getGithubUrl() {
        return githubUrl;
    }

    public void setGithubUrl(String githubUrl) {
        this.githubUrl = githubUrl;
    }

    public String getLinkedinUrl() {
        return linkedinUrl;
    }

    public void setLinkedinUrl(String linkedinUrl) {
        this.linkedinUrl = linkedinUrl;
    }

    public String getPortfolioUrl() {
        return portfolioUrl;
    }

    public void setPortfolioUrl(String portfolioUrl) {
        this.portfolioUrl = portfolioUrl;
    }

    public String getRoleCode() {
        return roleCode;
    }

    void setRoleCode(String roleCode) {
        this.roleCode = roleCode;
    }

    public String getStatus() {
        return status;
    }

    void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
