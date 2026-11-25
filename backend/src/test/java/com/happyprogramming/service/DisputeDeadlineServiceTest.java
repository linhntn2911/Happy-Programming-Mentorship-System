package com.happyprogramming.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.happyprogramming.repository.DisputeDeadlineRepository;
import com.happyprogramming.repository.DisputeDeadlineRepository.DeadlineTarget;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class DisputeDeadlineServiceTest {
    @Test
    void warnsMentorAndAssignedStaffWhenResponseDeadlineIsNear() {
        RecordingDeadlineRepository deadlines = new RecordingDeadlineRepository();
        deadlines.responseDueSoon = List.of(target(15L, "DISP-015", 20L, 30L));
        RecordingNotificationService notifications = new RecordingNotificationService();

        var result = new DisputeDeadlineService(deadlines, notifications, 6, 12).sendDeadlineAlerts();

        assertEquals(1, result.mentorAlerts());
        assertEquals(1, result.staffAlerts());
        assertEquals(List.of(
                "20|DISPUTE_MENTOR_DEADLINE_SOON|Dispute response due soon: DISP-015|#/mentor/disputes",
                "30|DISPUTE_STAFF_RESPONSE_DUE_SOON|Mentor response due soon: DISP-015|#/staff/reports/15"),
                notifications.created);
    }

    @Test
    void doesNotCreateTheSameAlertTwice() {
        RecordingDeadlineRepository deadlines = new RecordingDeadlineRepository();
        deadlines.responseDueSoon = List.of(target(15L, "DISP-015", 20L, 30L));
        RecordingNotificationService notifications = new RecordingNotificationService();
        notifications.existing.add("20|DISPUTE_MENTOR_DEADLINE_SOON|Dispute response due soon: DISP-015");
        notifications.existing.add("30|DISPUTE_STAFF_RESPONSE_DUE_SOON|Mentor response due soon: DISP-015");

        var result = new DisputeDeadlineService(deadlines, notifications, 6, 12).sendDeadlineAlerts();

        assertEquals(0, result.mentorAlerts());
        assertEquals(0, result.staffAlerts());
        assertEquals(List.of(), notifications.created);
    }

    @Test
    void warnsMentorAndStaffAfterMentorResponseDeadlinePasses() {
        RecordingDeadlineRepository deadlines = new RecordingDeadlineRepository();
        deadlines.responseOverdue = List.of(target(15L, "DISP-015", 20L, 30L));
        RecordingNotificationService notifications = new RecordingNotificationService();

        var result = new DisputeDeadlineService(deadlines, notifications, 6, 12).sendDeadlineAlerts();

        assertEquals(1, result.mentorAlerts());
        assertEquals(1, result.staffAlerts());
        assertEquals(List.of(
                "20|DISPUTE_MENTOR_RESPONSE_OVERDUE|Dispute response overdue: DISP-015|#/mentor/disputes",
                "30|DISPUTE_STAFF_RESPONSE_OVERDUE|Mentor response overdue: DISP-015|#/staff/reports/15"),
                notifications.created);
        assertEquals(true, notifications.messages.stream().anyMatch(message ->
                message.contains("Responses are now closed") && message.contains("available evidence")));
    }

    @Test
    void warnsAssignedStaffBeforeAndAfterResolutionSla() {
        RecordingDeadlineRepository deadlines = new RecordingDeadlineRepository();
        deadlines.resolutionDueSoon = List.of(target(15L, "DISP-015", 20L, 30L));
        deadlines.resolutionOverdue = List.of(target(16L, "DISP-016", 21L, 31L));
        RecordingNotificationService notifications = new RecordingNotificationService();

        var result = new DisputeDeadlineService(deadlines, notifications, 6, 12).sendDeadlineAlerts();

        assertEquals(0, result.mentorAlerts());
        assertEquals(2, result.staffAlerts());
        assertEquals(List.of(
                "30|DISPUTE_STAFF_RESOLUTION_DUE_SOON|Dispute resolution due soon: DISP-015|#/staff/reports/15",
                "31|DISPUTE_STAFF_RESOLUTION_OVERDUE|Dispute resolution overdue: DISP-016|#/staff/reports/16"),
                notifications.created);
    }

    @Test
    void warnsTheStaffRoleWhenNoStaffMemberHasTakenTheCaseYet() {
        RecordingDeadlineRepository deadlines = new RecordingDeadlineRepository();
        deadlines.resolutionDueSoon = List.of(target(17L, "DISP-017", 22L, null));
        RecordingNotificationService notifications = new RecordingNotificationService();

        var result = new DisputeDeadlineService(deadlines, notifications, 6, 12).sendDeadlineAlerts();

        assertEquals(1, result.staffAlerts());
        assertEquals(List.of(
                "ROLE:STAFF|DISPUTE_STAFF_RESOLUTION_DUE_SOON|Dispute resolution due soon: DISP-017|#/staff/reports/17"),
                notifications.created);
    }

    private DeadlineTarget target(long disputeId, String ticketCode, long mentorId, Long staffId) {
        return new DeadlineTarget(
                disputeId, ticketCode, mentorId, staffId,
                Instant.parse("2026-11-25T10:00:00Z"),
                Instant.parse("2026-11-26T10:00:00Z"));
    }

    private static final class RecordingDeadlineRepository extends DisputeDeadlineRepository {
        private List<DeadlineTarget> responseDueSoon = List.of();
        private List<DeadlineTarget> responseOverdue = List.of();
        private List<DeadlineTarget> resolutionDueSoon = List.of();
        private List<DeadlineTarget> resolutionOverdue = List.of();

        private RecordingDeadlineRepository() {
            super(new JdbcTemplate());
        }

        @Override
        public List<DeadlineTarget> findMentorResponseDueSoon(int warningHours) {
            return responseDueSoon;
        }

        @Override
        public List<DeadlineTarget> findMentorResponseOverdue() {
            return responseOverdue;
        }

        @Override
        public List<DeadlineTarget> findStaffResolutionDueSoon(int warningHours) {
            return resolutionDueSoon;
        }

        @Override
        public List<DeadlineTarget> findStaffResolutionOverdue() {
            return resolutionOverdue;
        }
    }

    private static final class RecordingNotificationService extends NotificationService {
        private final Set<String> existing = new HashSet<>();
        private final List<String> created = new ArrayList<>();
        private final List<String> messages = new ArrayList<>();

        private RecordingNotificationService() {
            super(null, Clock.systemUTC());
        }

        @Override
        public boolean createOnce(Long userId, String title, String message, String type, String actionUrl) {
            String key = userId + "|" + type + "|" + title;
            if (existing.contains(key)) return false;
            existing.add(key);
            created.add(key + "|" + actionUrl);
            messages.add(message);
            return true;
        }

        @Override
        public int notifyRoleOnce(String role, String title, String message, String type, String actionUrl) {
            String key = "ROLE:" + role + "|" + type + "|" + title;
            if (existing.contains(key)) return 0;
            existing.add(key);
            created.add(key + "|" + actionUrl);
            messages.add(message);
            return 1;
        }
    }
}
