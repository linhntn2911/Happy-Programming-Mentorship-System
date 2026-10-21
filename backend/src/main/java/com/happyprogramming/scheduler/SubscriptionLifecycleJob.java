package com.happyprogramming.scheduler;

import com.happyprogramming.service.SubscriptionLifecycleService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "hpms.subscriptions.lifecycle.enabled", havingValue = "true")
public class SubscriptionLifecycleJob {
    private final SubscriptionLifecycleService service;

    public SubscriptionLifecycleJob(SubscriptionLifecycleService service) {
        this.service = service;
    }

    @Scheduled(fixedDelayString = "${hpms.subscriptions.lifecycle-scan-ms:60000}")
    public void advanceMonthlySubscriptions() {
        service.advanceLifecycle();
    }
}
