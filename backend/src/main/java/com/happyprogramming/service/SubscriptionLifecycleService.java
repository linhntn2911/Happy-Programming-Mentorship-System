package com.happyprogramming.service;

import com.happyprogramming.repository.SubscriptionLifecycleRepository;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SubscriptionLifecycleService {
    private final SubscriptionLifecycleRepository repository;
    private final JdbcTemplate jdbc;
    private final EmailService emailService;

    public SubscriptionLifecycleService(SubscriptionLifecycleRepository repository) {
        this(repository, null, null);
    }

    @Autowired
    public SubscriptionLifecycleService(
            SubscriptionLifecycleRepository repository,
            @Autowired(required = false) JdbcTemplate jdbc,
            @Autowired(required = false) EmailService emailService) {
        this.repository = repository;
        this.jdbc = jdbc;
        this.emailService = emailService;
    }

    @Transactional
    public LifecycleResult advanceLifecycle() {
        int ended = repository.endExpiredSubscriptions();
        int activated = repository.activateCompletedTrials();
        int remindersSent = sendDay5DisputeAssuranceReminders();
        return new LifecycleResult(ended, activated, remindersSent);
    }

    public int sendDay5DisputeAssuranceReminders() {
        List<SubscriptionLifecycleRepository.Day5ReminderTarget> targets = repository.findEligibleDay5Reminders();
        int sent = 0;
        for (var target : targets) {
            try {
                String title = "[Learning Assurance Reminder] Mentorship package " + target.packageName() + " 7-day assurance ending soon";
                String msg = String.format(
                        "Your mentorship package \"%s\" with Mentor %s is on day 5. " +
                        "During the first 7 days, your payment is held securely in escrow. " +
                        "If you experience any quality issues or mentor inactivity, " +
                        "please file a Dispute report before day 7 for immediate review.",
                        target.packageName(), target.mentorName());
                String actionUrl = "#/applications?requestId=" + target.requestId();

                if (jdbc != null) {
                    jdbc.update("""
                            INSERT INTO dbo.notifications (user_id, title, message, type, action_url, is_read, created_at)
                            VALUES (?, ?, ?, 'DAY5_ASSURANCE_REMINDER', ?, 0, SYSUTCDATETIME())
                            """, target.menteeId(), title, msg, actionUrl);
                }

                if (emailService != null && target.menteeEmail() != null && !target.menteeEmail().isBlank()) {
                    String subject = "[HappyProgramming] Learning Assurance Reminder - 7-Day Protection Window";
                    String emailBody = String.format(
                            "Hello %s,\n\n" +
                            "Your mentorship package \"%s\" with Mentor %s has reached day 5.\n\n" +
                            "HappyProgramming reminds you of our 7-Day Mentee Protection policy:\n" +
                            "• During the first 7 days, tuition is held securely in escrow.\n" +
                            "• If you experience any issues (mentor absence, failure to meet commitments), " +
                            "submitting a dispute report within the 7-day window enables prompt review and refund processing.\n\n" +
                            "To inspect your package or submit a dispute, please visit:\n" +
                            "#/applications?requestId=%d\n\n" +
                            "Have a great learning journey with HappyProgramming!\n\n" +
                            "Best regards,\nHappyProgramming Support Team",
                            target.menteeName() != null ? target.menteeName() : "Mentee",
                            target.packageName(),
                            target.mentorName() != null ? target.mentorName() : "Mentor",
                            target.requestId());
                    emailService.sendNotification(target.menteeEmail(), subject, emailBody);
                }
                sent++;
            } catch (Exception ex) {
                // Ignore and proceed to next target
            }
        }
        return sent;
    }

    public record LifecycleResult(int ended, int activated, int remindersSent) {
        public LifecycleResult(int ended, int activated) {
            this(ended, activated, 0);
        }
    }
}
