package vn.happyprogramming.mentor;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "mentor_profiles", schema = "dbo")
public class MentorProfile {
    @Id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "slug", nullable = false, length = 200, unique = true)
    private String slug;

    @Column(name = "headline", nullable = false, length = 250)
    private String headline;

    @Column(name = "job_title", nullable = false, length = 150)
    private String jobTitle;

    @Column(name = "company_name", length = 200)
    private String companyName;

    @Column(name = "biography", nullable = false, length = 1000)
    private String biography;

    @Column(name = "years_experience", nullable = false, precision = 4, scale = 1)
    private BigDecimal yearsExperience;

    @Column(name = "experience_summary", columnDefinition = "nvarchar(max)")
    private String experienceSummary;

    @Column(name = "language_codes", nullable = false, length = 500)
    private String languageCodes = "[]";

    @Column(name = "is_public", nullable = false)
    private boolean isPublic;

    @Column(name = "accepting_mentees", nullable = false)
    private boolean acceptingMentees;

    @Column(name = "max_active_mentees", nullable = false)
    private int maxActiveMentees = 5;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected MentorProfile() {
    }

    @PrePersist
    protected void beforeInsert() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    protected void beforeUpdate() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getHeadline() {
        return headline;
    }

    public void setHeadline(String headline) {
        this.headline = headline;
    }

    public String getJobTitle() {
        return jobTitle;
    }

    public void setJobTitle(String jobTitle) {
        this.jobTitle = jobTitle;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getBiography() {
        return biography;
    }

    public void setBiography(String biography) {
        this.biography = biography;
    }

    public BigDecimal getYearsExperience() {
        return yearsExperience;
    }

    public void setYearsExperience(BigDecimal yearsExperience) {
        this.yearsExperience = yearsExperience;
    }

    public String getExperienceSummary() {
        return experienceSummary;
    }

    public void setExperienceSummary(String experienceSummary) {
        this.experienceSummary = experienceSummary;
    }

    public String getLanguageCodes() {
        return languageCodes;
    }

    public void setLanguageCodes(String languageCodes) {
        this.languageCodes = languageCodes;
    }

    public boolean isPublic() {
        return isPublic;
    }

    public void setPublic(boolean isPublic) {
        this.isPublic = isPublic;
    }

    public boolean isAcceptingMentees() {
        return acceptingMentees;
    }

    public void setAcceptingMentees(boolean acceptingMentees) {
        this.acceptingMentees = acceptingMentees;
    }

    public int getMaxActiveMentees() {
        return maxActiveMentees;
    }

    public void setMaxActiveMentees(int maxActiveMentees) {
        this.maxActiveMentees = maxActiveMentees;
    }

    public Long getApprovedBy() {
        return approvedBy;
    }

    public void setApprovedBy(Long approvedBy) {
        this.approvedBy = approvedBy;
    }

    public LocalDateTime getApprovedAt() {
        return approvedAt;
    }

    public void setApprovedAt(LocalDateTime approvedAt) {
        this.approvedAt = approvedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
