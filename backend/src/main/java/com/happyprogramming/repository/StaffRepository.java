package com.happyprogramming.repository;
import com.happyprogramming.dto.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
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
        return db.query("SELECT s.id,s.name,c.name category,s.description,s.is_active FROM dbo.skills s JOIN dbo.skill_categories c ON c.id=s.category_id ORDER BY s.name",
            (r,n)->new StaffReadDtos.Skill(r.getLong("id"),r.getString("name"),r.getString("category"),r.getString("description"),r.getBoolean("is_active")));
    }
    public List<StaffReadDtos.Request> requests() {
        return db.query("SELECT r.id,me.full_name mentee,m.full_name mentor,r.status,r.learning_goals,r.created_at FROM dbo.mentorship_requests r JOIN dbo.users me ON me.id=r.mentee_id JOIN dbo.users m ON m.id=r.mentor_id ORDER BY r.created_at DESC",
            (r,n)->new StaffReadDtos.Request(r.getLong("id"),r.getString("mentee"),r.getString("mentor"),r.getString("status"),r.getString("learning_goals"),r.getTimestamp("created_at").toLocalDateTime().toString()+"Z"));
    }
    public long pendingApplications() { return db.queryForObject("SELECT COUNT(*) FROM dbo.mentor_applications WHERE status='PENDING'",Long.class); }
    public long pendingRequests() { return db.queryForObject("SELECT COUNT(*) FROM dbo.mentorship_requests WHERE status='PENDING'",Long.class); }
}
