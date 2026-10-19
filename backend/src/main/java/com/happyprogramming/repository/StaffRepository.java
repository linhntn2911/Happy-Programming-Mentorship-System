package com.happyprogramming.repository;

import com.happyprogramming.dto.StaffActivityDto;
import com.happyprogramming.dto.StaffMenteeDto;
import com.happyprogramming.dto.StaffMentorDto;
import com.happyprogramming.dto.StaffReadDtos;
import com.happyprogramming.entity.Skill;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Repository
public class StaffRepository {
    private final JdbcTemplate db;
    public StaffRepository(JdbcTemplate db) { this.db=db; }
    public List<StaffMenteeDto> mentees() {
        return db.query("SELECT u.id,u.full_name,u.email,u.created_at,u.status,u.email_verified_at,(SELECT COUNT(*) FROM dbo.mentorship_requests r WHERE r.mentee_id=u.id) requests_count FROM dbo.users u WHERE u.role_code='MENTEE' OR EXISTS (SELECT 1 FROM dbo.user_roles r WHERE r.user_id=u.id AND r.role_code='MENTEE') ORDER BY u.created_at DESC",
            (r,n)->new StaffMenteeDto(r.getString("id"),r.getString("full_name"),r.getString("email"),r.getTimestamp("created_at").toLocalDateTime().toLocalDate().toString(),r.getInt("requests_count"),r.getString("status"),r.getTimestamp("email_verified_at")!=null));
    }
    public List<StaffMentorDto> mentors() {
        return db.query("SELECT u.id,u.full_name,u.email,u.status,u.bio,p.job_title,p.years_experience FROM dbo.users u LEFT JOIN dbo.mentor_profiles p ON p.user_id=u.id WHERE u.role_code='MENTOR' OR EXISTS (SELECT 1 FROM dbo.user_roles r WHERE r.user_id=u.id AND r.role_code='MENTOR') ORDER BY u.created_at DESC",
            (r,n)->new StaffMentorDto(r.getString("id"),r.getString("full_name"),r.getString("email"),r.getString("job_title"),
                db.queryForList("SELECT s.name FROM dbo.mentor_skills ms JOIN dbo.skills s ON s.id=ms.skill_id WHERE ms.mentor_id=? ORDER BY ms.display_order",String.class,r.getLong("id")),
                r.getInt("years_experience"),r.getString("status"),r.getString("bio"),null,null,null));
    }
    public List<StaffReadDtos.Skill> skills() {
        return db.query("SELECT s.id,s.name,s.slug,s.category_id,c.name category,s.description,s.is_active FROM dbo.skills s JOIN dbo.skill_categories c ON c.id=s.category_id ORDER BY s.name",
            (r,n)->new StaffReadDtos.Skill(r.getLong("id"),r.getString("name"),r.getString("slug"),r.getLong("category_id"),r.getString("category"),r.getString("description"),r.getBoolean("is_active")));
    }
    public List<StaffReadDtos.SkillCategory> skillCategories() {
        return db.query("SELECT id, name, slug FROM dbo.skill_categories WHERE is_active=1 ORDER BY display_order, id",
            (r,n)->new StaffReadDtos.SkillCategory(r.getLong("id"),r.getString("name"),r.getString("slug")));
    }
    public List<StaffReadDtos.Request> requests() {
        return db.query("SELECT r.id,me.full_name mentee,m.full_name mentor,r.status,r.learning_goals,r.created_at FROM dbo.mentorship_requests r JOIN dbo.users me ON me.id=r.mentee_id JOIN dbo.users m ON m.id=r.mentor_id ORDER BY r.created_at DESC",
            (r,n)->new StaffReadDtos.Request(r.getLong("id"),r.getString("mentee"),r.getString("mentor"),r.getString("status"),r.getString("learning_goals"),r.getTimestamp("created_at").toLocalDateTime().toString()+"Z"));
    }
    public long pendingApplications() { return db.queryForObject("SELECT COUNT(*) FROM dbo.mentor_applications WHERE status='PENDING'",Long.class); }
    public long pendingRequests() { return db.queryForObject("SELECT COUNT(*) FROM dbo.mentorship_requests WHERE status='PENDING'",Long.class); }

    public List<StaffActivityDto> recentActivities() {
        return db.query("""
            SELECT TOP 10 a.id, a.action, a.entity_type, a.entity_id, a.reason, a.created_at,
                   COALESCE(u.full_name, 'Staff') actor_name
            FROM dbo.audit_logs a
            LEFT JOIN dbo.users u ON u.id = a.actor_id
            ORDER BY a.created_at DESC, a.id DESC
            """, (r, n) -> {
                long id = r.getLong("id");
                String action = r.getString("action");
                String entityType = r.getString("entity_type");
                String entityId = r.getString("entity_id");
                String reason = r.getString("reason");
                Timestamp createdAt = r.getTimestamp("created_at");

                String type = entityType != null ? entityType.toLowerCase(Locale.ROOT) : "general";
                String title;
                String status = "ACTIVE";
                String description = reason != null && !reason.isBlank() ? reason : "Operational action performed";

                if ("CREATE_SKILL".equals(action)) {
                    title = "Created technical skill #" + entityId;
                    status = "SUCCESS";
                } else if ("UPDATE_SKILL".equals(action)) {
                    title = "Updated technical skill #" + entityId;
                    status = "ACTIVE";
                } else if ("TOGGLE_SKILL_STATUS".equals(action)) {
                    title = "Toggled skill status #" + entityId;
                    status = "ACTIVE";
                } else if ("PAYOUT_PAID".equals(action)) {
                    title = "Withdrawal request #" + entityId + " paid";
                    status = "SUCCESS";
                } else if ("PAYOUT_REJECTED".equals(action)) {
                    title = "Withdrawal request #" + entityId + " rejected";
                    status = "DANGER";
                } else if ("DISPUTE_INTAKE".equals(action)) {
                    title = "Dispute #" + entityId + " in mediation";
                    status = "WARNING";
                } else if ("DISPUTE_RESOLVED".equals(action)) {
                    title = "Dispute #" + entityId + " resolved";
                    status = "SUCCESS";
                } else if ("ACCOUNT_STATUS_CHANGED".equals(action)) {
                    title = "Account #" + entityId + " status updated";
                    status = "NEUTRAL";
                } else if (action != null) {
                    title = action.replace('_', ' ').toLowerCase(Locale.ROOT);
                    title = Character.toUpperCase(title.charAt(0)) + title.substring(1);
                } else {
                    title = "Operational update";
                }

                String timeAgo = formatTimeAgo(createdAt != null ? createdAt.toInstant() : null);
                return new StaffActivityDto(String.valueOf(id), type, title, description, status, timeAgo);
            });
    }

    private static String formatTimeAgo(Instant time) {
        if (time == null) return "Recently";
        long seconds = Duration.between(time, Instant.now()).getSeconds();
        if (seconds < 0 || seconds < 60) return "Just now";
        long minutes = seconds / 60;
        if (minutes < 60) return minutes + "m ago";
        long hours = minutes / 60;
        if (hours < 24) return hours + "h ago";
        long days = hours / 24;
        return days + "d ago";
    }
}
