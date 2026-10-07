package vn.happyprogramming.mentor;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "mentorship_requests", schema = "dbo")
public class MentorshipRequest {
    @Id
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "mentee_id", nullable = false)
    private Long menteeId;

    @Column(name = "mentor_id", nullable = false)
    private Long mentorId;

    @Column(name = "service_id", nullable = false)
    private Long serviceId;

    @Column(name = "learning_goals", nullable = false, length = 4000)
    private String learningGoals;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "response_deadline")
    private LocalDateTime responseDeadline;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    protected MentorshipRequest() {
    }
}
