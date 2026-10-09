package com.happyprogramming.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "mentor_applications", schema = "dbo")
public class MentorApplication {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "applicant_id") private Long applicantId;
    private String biography;
    @Column(name = "years_experience") private BigDecimal yearsExperience;
    @Column(name = "professional_background") private String professionalBackground;
    @Column(name = "profile_snapshot") private String profileSnapshot;
    private String status;
    @Column(name = "submitted_at") private LocalDateTime submittedAt;
    @Column(name = "reviewed_by") private Long reviewedBy;
    @Column(name = "reviewed_at") private LocalDateTime reviewedAt;
    @Column(name = "rejection_reason") private String rejectionReason;
    @Column(name = "created_at") private LocalDateTime createdAt;
    @Column(name = "updated_at") private LocalDateTime updatedAt;
    @Column(name = "otp_hash") private String otpHash;
    @Column(name = "otp_expires_at") private LocalDateTime otpExpiresAt;
    @Column(name = "otp_sent_at") private LocalDateTime otpSentAt;
    @Column(name = "otp_attempts") private int otpAttempts;
    @Column(name = "cv_file_name") private String cvFileName;
    @Column(name = "cv_content") private byte[] cvContent;

    public static MentorApplication draft(Long owner, LocalDateTime now) {
        var a = new MentorApplication();
        a.applicantId = owner; a.createdAt = now; a.status = "DRAFT";
        return a;
    }
    public void update(String bio, BigDecimal years, String background, String snapshot,
                       String fileName, byte[] content, LocalDateTime now) {
        biography = bio; yearsExperience = years; professionalBackground = background;
        profileSnapshot = snapshot; cvFileName = fileName; cvContent = content; updatedAt = now;
    }
    public void issue(String hash, LocalDateTime now) {
        otpHash = hash; otpSentAt = now; otpExpiresAt = now.plusMinutes(15); otpAttempts = 0; updatedAt = now;
    }
    public void failOtp() { otpAttempts++; }
    public void submit(LocalDateTime now) {
        status = "PENDING"; submittedAt = now; updatedAt = now; otpHash = null;
    }
    public void review(String decision, String reason, Long reviewer, LocalDateTime now) {
        status = decision; rejectionReason = "REJECTED".equals(decision) ? reason : null;
        reviewedBy = reviewer; reviewedAt = now; updatedAt = now;
    }
    public Long getId() { return id; }
    public Long getApplicantId() { return applicantId; }
    public String getBiography() { return biography; }
    public BigDecimal getYearsExperience() { return yearsExperience; }
    public String getProfessionalBackground() { return professionalBackground; }
    public String getProfileSnapshot() { return profileSnapshot; }
    public String getStatus() { return status; }
    public String getRejectionReason() { return rejectionReason; }
    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public LocalDateTime getOtpExpiresAt() { return otpExpiresAt; }
    public LocalDateTime getOtpSentAt() { return otpSentAt; }
    public String getOtpHash() { return otpHash; }
    public int getOtpAttempts() { return otpAttempts; }
    public String getCvFileName() { return cvFileName; }
    public byte[] getCvContent() { return cvContent; }
}
