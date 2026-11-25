package com.happyprogramming.scheduler;

import com.happyprogramming.service.DisputeDeadlineService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(
        name = "hpms.disputes.deadline-alerts.enabled",
        havingValue = "true",
        matchIfMissing = true)
public class DisputeDeadlineAlertJob {
    private final DisputeDeadlineService deadlines;

    public DisputeDeadlineAlertJob(DisputeDeadlineService deadlines) {
        this.deadlines = deadlines;
    }

    @Scheduled(fixedDelayString = "${hpms.disputes.deadline-alerts.scan-ms:300000}")
    public void sendApproachingAndOverdueAlerts() {
        deadlines.sendDeadlineAlerts();
    }
}
