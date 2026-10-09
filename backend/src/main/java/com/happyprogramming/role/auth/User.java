package com.happyprogramming.role.auth;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users", schema = "dbo")
public class User {
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", schema = "dbo", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "role_code")
    private java.util.Set<String> additionalRoles = new java.util.HashSet<>();

    public java.util.Set<String> getRoles() {
        var roles = new java.util.HashSet<>(additionalRoles);
        roles.add(role);
        return java.util.Set.copyOf(roles);
    }
    public boolean hasRole(String value) { return getRoles().contains(value); }
    public void approveMentor() {
        this.role = "MENTOR";
        additionalRoles.add("MENTEE");
        additionalRoles.add("MENTOR");
    }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "email", updatable = false) private String email;
    @Column(name = "email_normalized", insertable = false, updatable = false) private String emailNormalized;
    @Column(name = "full_name") private String fullName;
    @Column(name = "first_name") private String firstName;
    @Column(name = "last_name") private String lastName;
    @Column(name = "role_code") private String role;
    @Column(name = "status") private String status;
    @Column(name = "email_verified_at") private LocalDateTime emailVerifiedAt;
    @Column(name = "password_hash") private String passwordHash;
    @Column(name = "failed_login_count") private int failedLoginCount;
    @Column(name = "locked_until") private LocalDateTime lockedUntil;
    @Column(name = "last_login_at") private LocalDateTime lastLoginAt;
    @Column(name = "created_at", updatable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at") private LocalDateTime updatedAt;

    public static User createMentee(String email, String firstName, String lastName, String passwordHash, LocalDateTime now) {
        var user = new User();
        user.email = email.trim();
        user.firstName = firstName.trim();
        user.lastName = lastName.trim();
        user.fullName = (firstName.trim() + " " + lastName.trim()).trim();
        user.role = "MENTEE";
        user.status = "INACTIVE";
        user.emailVerifiedAt = null;
        user.passwordHash = passwordHash;
        user.failedLoginCount = 0;
        user.createdAt = now;
        user.updatedAt = now;
        return user;
    }

    public static User createMentor(String email, String firstName, String lastName, String passwordHash, LocalDateTime now) {
        var user = new User();
        user.email = email.trim();
        user.firstName = firstName.trim();
        user.lastName = lastName.trim();
        user.fullName = (firstName.trim() + " " + lastName.trim()).trim();
        user.role = "MENTEE";
        user.status = "INACTIVE";
        user.emailVerifiedAt = null;
        user.passwordHash = passwordHash;
        user.failedLoginCount = 0;
        user.createdAt = now;
        user.updatedAt = now;
        return user;
    }

    public static User createGoogleUser(String email, String fullName, String firstName, String lastName, String role, LocalDateTime now) {
        var user = new User();
        user.email = email.trim();
        user.firstName = firstName != null && !firstName.isBlank() ? firstName.trim() : "";
        user.lastName = lastName != null && !lastName.isBlank() ? lastName.trim() : "";
        user.fullName = fullName != null && !fullName.isBlank() ? fullName.trim() : ((user.firstName + " " + user.lastName).trim().isEmpty() ? "User" : (user.firstName + " " + user.lastName).trim());
        user.role = "MENTEE";
        user.emailVerifiedAt = now;
        user.status = "ACTIVE";
        user.passwordHash = null;
        user.failedLoginCount = 0;
        user.createdAt = now;
        user.updatedAt = now;
        return user;
    }

    @Column(name="bio") private String bio;
    @Column(name="experience_level") private String experienceLevel;
    @Column(name="learning_goals") private String learningGoals;
    @Column(name="github_url") private String githubUrl;
    @Column(name="portfolio_url") private String portfolioUrl;
    @Column(name="linkedin_url") private String linkedinUrl;
    @Column(name="avatar_file_id") private Long avatarFileId;
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public String getExperienceLevel() { return experienceLevel; }
    public String getLearningGoals() { return learningGoals; }
    public String getGithubUrl() { return githubUrl; }
    public void setGithubUrl(String url) { this.githubUrl = url; }
    public String getPortfolioUrl() { return portfolioUrl; }
    public void setPortfolioUrl(String url) { this.portfolioUrl = url; }
    public String getLinkedinUrl() { return linkedinUrl; }
    public void setLinkedinUrl(String url) { this.linkedinUrl = url; }
    public Long getAvatarFileId() { return avatarFileId; }
    public void setAvatarFileId(Long id, LocalDateTime now) { avatarFileId=id; updatedAt=now; }
    public void updateProfile(String first, String last, String bio, String level, String goals, String github, String portfolio, LocalDateTime now) {
        firstName=first; lastName=last; fullName=first+" "+last;
        this.bio=bio; experienceLevel=level; learningGoals=goals; githubUrl=github; portfolioUrl=portfolio; updatedAt=now;
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getFullName() { return fullName; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public String getRole() { return role; }
    public String getRoleCode() { return role; }
    public String getStatus() { return status; }
    public String getPasswordHash() { return passwordHash; }
    public int getFailedLoginCount() { return failedLoginCount; }
    public LocalDateTime getLockedUntil() { return lockedUntil; }
    public LocalDateTime getEmailVerifiedAt() { return emailVerifiedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void activateEmail(LocalDateTime now) {
        this.status = "ACTIVE";
        this.emailVerifiedAt = now;
        this.updatedAt = now;
    }

    public void resetExpiredLock(LocalDateTime now) {
        if (lockedUntil != null && !lockedUntil.isAfter(now)) {
            failedLoginCount = 0;
            lockedUntil = null;
        }
    }
    public void recordFailure(LocalDateTime now) {
        failedLoginCount = Math.min(failedLoginCount + 1, 5);
        if (failedLoginCount >= 5) lockedUntil = now.plusMinutes(15);
        updatedAt = now;
    }
    public void recordLogin(LocalDateTime now) {
        failedLoginCount = 0;
        lockedUntil = null;
        lastLoginAt = now;
        updatedAt = now;
    }
}
