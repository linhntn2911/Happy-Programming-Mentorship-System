package com.happyprogramming.entity;

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
    public void approveMentor() { additionalRoles.add("MENTEE"); additionalRoles.add("MENTOR"); }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "email", updatable = false) private String email;
    @Column(name = "email_normalized", insertable = false, updatable = false) private String emailNormalized;
    @Column(name = "full_name", updatable = false) private String fullName;
    @Column(name = "first_name") private String firstName;
    @Column(name = "last_name") private String lastName;
    @Column(name = "role_code", updatable = false) private String role;
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

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getFullName() { return fullName; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public String getRole() { return role; }
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
