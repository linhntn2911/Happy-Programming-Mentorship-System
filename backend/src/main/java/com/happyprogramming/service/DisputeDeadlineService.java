package com.happyprogramming.service;

import com.happyprogramming.repository.DisputeDeadlineRepository;
import com.happyprogramming.repository.DisputeDeadlineRepository.DeadlineTarget;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DisputeDeadlineService {
    private static final String MENTOR_ACTION_URL = "#/mentor/disputes";

    private final DisputeDeadlineRepository deadlines;
    private final NotificationService notificationService;
    private final int mentorWarningHours;
    private final int staffWarningHours;

    public DisputeDeadlineService(
            DisputeDeadlineRepository deadlines,
            NotificationService notificationService,
            @Value("${hpms.disputes.deadline-alerts.mentor-warning-hours:6}") int mentorWarningHours,
            @Value("${hpms.disputes.deadline-alerts.staff-warning-hours:12}") int staffWarningHours) {
        this.deadlines = deadlines;
        this.notificationService = notificationService;
        this.mentorWarningHours = mentorWarningHours;
        this.staffWarningHours = staffWarningHours;
    }

    @Transactional
    public AlertResult sendDeadlineAlerts() {
        int mentorAlerts = 0;
        int staffAlerts = 0;

        for (DeadlineTarget target : deadlines.findMentorResponseDueSoon(mentorWarningHours)) {
            String mentorTitle = "Dispute response due soon: " + target.ticketCode();
            mentorAlerts += notifyOnce(
                    target.mentorId(), mentorTitle,
                    "Your response for ticket " + target.ticketCode() + " is due within "
                            + mentorWarningHours + " hours. Open the dispute and submit your statement and evidence.",
                    "DISPUTE_MENTOR_DEADLINE_SOON", MENTOR_ACTION_URL);

            String staffTitle = "Mentor response due soon: " + target.ticketCode();
            staffAlerts += notifyStaffOnce(target, staffTitle,
                    "The mentor response deadline for ticket " + target.ticketCode() + " is within "
                            + mentorWarningHours + " hours. Monitor the case and prepare the next action.",
                    "DISPUTE_STAFF_RESPONSE_DUE_SOON");
        }

        for (DeadlineTarget target : deadlines.findMentorResponseOverdue()) {
            String mentorTitle = "Dispute response overdue: " + target.ticketCode();
            mentorAlerts += notifyOnce(
                    target.mentorId(), mentorTitle,
                    "The response deadline for ticket " + target.ticketCode()
                            + " has passed. Responses are now closed, and Staff may decide from the available evidence.",
                    "DISPUTE_MENTOR_RESPONSE_OVERDUE", MENTOR_ACTION_URL);

            String staffTitle = "Mentor response overdue: " + target.ticketCode();
            staffAlerts += notifyStaffOnce(target, staffTitle,
                    "The mentor has missed the response deadline for ticket " + target.ticketCode()
                            + ". Review the available evidence and continue mediation.",
                    "DISPUTE_STAFF_RESPONSE_OVERDUE");
        }

        for (DeadlineTarget target : deadlines.findStaffResolutionDueSoon(staffWarningHours)) {
            String title = "Dispute resolution due soon: " + target.ticketCode();
            staffAlerts += notifyStaffOnce(target, title,
                    "The 48-hour resolution SLA for ticket " + target.ticketCode() + " ends within "
                            + staffWarningHours + " hours. Review the evidence and record a decision.",
                    "DISPUTE_STAFF_RESOLUTION_DUE_SOON");
        }

        for (DeadlineTarget target : deadlines.findStaffResolutionOverdue()) {
            String title = "Dispute resolution overdue: " + target.ticketCode();
            staffAlerts += notifyStaffOnce(target, title,
                    "Ticket " + target.ticketCode()
                            + " is past the 48-hour resolution SLA. Review the evidence and record a decision as soon as possible.",
                    "DISPUTE_STAFF_RESOLUTION_OVERDUE");
        }

        return new AlertResult(mentorAlerts, staffAlerts);
    }

    private int notifyOnce(Long userId, String title, String message, String type, String actionUrl) {
        return notificationService.createOnce(userId, title, message, type, actionUrl) ? 1 : 0;
    }

    private int notifyStaffOnce(DeadlineTarget target, String title, String message, String type) {
        if (target.staffId() != null) {
            return notifyOnce(target.staffId(), title, message, type, staffActionUrl(target));
        }
        return notificationService.notifyRoleOnce("STAFF", title, message, type, staffActionUrl(target));
    }

    private String staffActionUrl(DeadlineTarget target) {
        return "#/staff/reports/" + target.disputeId();
    }

    public record AlertResult(int mentorAlerts, int staffAlerts) {
    }
}
