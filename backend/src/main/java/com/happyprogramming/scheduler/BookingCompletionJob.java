package com.happyprogramming.scheduler;

import com.happyprogramming.repository.BookingLifecycleRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "hpms.bookings.completion.enabled", havingValue = "true")
public class BookingCompletionJob {
    private final BookingLifecycleRepository repository;

    public BookingCompletionJob(BookingLifecycleRepository repository) {
        this.repository = repository;
    }

    @Scheduled(fixedDelayString = "${hpms.bookings.completion-scan-ms:60000}")
    public void completeEndedOneOffBookings() {
        repository.completeEndedOneOffBookings();
    }
}
