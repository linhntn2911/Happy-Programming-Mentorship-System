package com.happyprogramming.scheduler;

import com.happyprogramming.repository.MentorAvailabilityRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * JOB-02 (SRS): every 15 minutes, release temporary slot holds whose 10-minute reservation window
 * (BR-10) has elapsed. Expiring a HELD row removes it from the active-hold set so the underlying
 * availability slot becomes bookable again.
 */
@Component
@ConditionalOnProperty(name = "hpms.availability.hold-expiry.enabled", havingValue = "true")
public class SlotHoldExpiryJob {
    private final MentorAvailabilityRepository repository;

    public SlotHoldExpiryJob(@Autowired(required = false) MentorAvailabilityRepository repository) {
        this.repository = repository;
    }

    @Scheduled(fixedDelayString = "${hpms.availability.hold-expiry-scan-ms:900000}")
    public void expireOverdueHolds() {
        if (repository == null) {
            return;
        }
        repository.expireOverdueHolds();
    }
}
