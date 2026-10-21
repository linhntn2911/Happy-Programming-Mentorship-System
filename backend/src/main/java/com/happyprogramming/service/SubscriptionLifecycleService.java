package com.happyprogramming.service;

import com.happyprogramming.repository.SubscriptionLifecycleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SubscriptionLifecycleService {
    private final SubscriptionLifecycleRepository repository;

    public SubscriptionLifecycleService(SubscriptionLifecycleRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public LifecycleResult advanceLifecycle() {
        int ended = repository.endExpiredSubscriptions();
        int activated = repository.activateCompletedTrials();
        return new LifecycleResult(ended, activated);
    }

    public record LifecycleResult(int ended, int activated) {}
}
