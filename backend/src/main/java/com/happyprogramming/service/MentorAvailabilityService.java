package com.happyprogramming.service;

import com.happyprogramming.dto.MentorAvailabilitySlotRequest;
import com.happyprogramming.dto.MentorAvailabilitySlotResponse;
import com.happyprogramming.dto.PublicAvailabilitySlotResponse;
import com.happyprogramming.repository.MentorAvailabilityRepository;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Mentor-owned in-app availability: mentors publish concrete open slots (EXTRA_AVAILABLE) that
 * mentees can later hold. Includes the conflict-checking engine that rejects overlapping slots.
 */
@Service
public class MentorAvailabilityService {
    private static final Duration PUBLIC_WINDOW = Duration.ofDays(90);
    private static final int SLOT_INTERVAL_MINUTES = 10;
    private static final int MIN_SESSION_MINUTES = 10;
    private static final int MIN_ADVANCE_HOURS = 2;

    private final MentorService mentorService;
    private final MentorAvailabilityRepository repository;
    private final Clock clock;

    public MentorAvailabilityService(
            MentorService mentorService,
            MentorAvailabilityRepository repository,
            @Autowired(required = false) Clock clock) {
        this.mentorService = mentorService;
        this.repository = repository;
        this.clock = clock != null ? clock : Clock.systemUTC();
    }

    @Transactional(readOnly = true)
    public List<MentorAvailabilitySlotResponse> listMySlots() {
        long mentorId = mentorService.currentActiveMentorUserId();
        return repository.findUpcomingSlots(mentorId);
    }

    @Transactional
    public MentorAvailabilitySlotResponse createSlot(MentorAvailabilitySlotRequest request) {
        long mentorId = mentorService.currentActiveMentorUserId();
        Instant startAt = request.startAt();
        Instant endAt = request.endAt();
        if (!endAt.isAfter(startAt)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The slot must end after it starts.");
        }
        if (Duration.between(startAt, endAt).toMinutes() < MIN_SESSION_MINUTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Availability windows must be at least 10 minutes long.");
        }
        if (!startAt.isAfter(Instant.now(clock))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Availability slots must start in the future.");
        }
        if (repository.existsOverlappingSlot(mentorId, startAt, endAt)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "This slot overlaps availability you have already published.");
        }
        String reason = trimToNull(request.reason());
        long slotId = repository.insertSlot(mentorId, startAt, endAt, reason);
        return repository.findUpcomingSlots(mentorId).stream()
                .filter(slot -> slot.id() == slotId)
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR, "Availability slot could not be created."));
    }

    @Transactional
    public void deleteSlot(long slotId) {
        long mentorId = mentorService.currentActiveMentorUserId();
        MentorAvailabilitySlotResponse slot = repository.findSlotForMentor(slotId, mentorId);
        if (slot == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Availability slot not found.");
        }
        if (repository.existsOverlappingHold(mentorId, slot.startAt(), slot.endAt())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "This slot has been booked and can no longer be removed.");
        }
        repository.deleteSlot(slotId, mentorId);
    }

    @Transactional(readOnly = true)
    public List<PublicAvailabilitySlotResponse> listPublicSlots(String identifier, Instant from, Instant to) {
        return listPublicSlots(identifier, null, from, to);
    }

    @Transactional(readOnly = true)
    public List<PublicAvailabilitySlotResponse> listPublicSlots(
            String identifier, Long serviceOfferingId, Instant from, Instant to) {
        if (identifier == null || identifier.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid mentor identifier is required.");
        }
        Long mentorId = repository.resolveMentorId(identifier.trim());
        if (mentorId == null) {
            return List.of();
        }
        Instant now = Instant.now(clock);
        Instant lowerBound = from != null && from.isAfter(now) ? from : now;
        Instant upperBound = to != null && to.isAfter(lowerBound) ? to : lowerBound.plus(PUBLIC_WINDOW);
        if (serviceOfferingId == null) {
            return repository.findPublicSlots(mentorId, lowerBound, upperBound);
        }
        Map<String, Object> offering = repository.findActiveOneOffOffering(serviceOfferingId, mentorId);
        if (offering == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The selected one-off session is no longer available.");
        }
        int durationMinutes = ((Number) offering.get("session_duration_minutes")).intValue();
        if (durationMinutes < MIN_SESSION_MINUTES) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This session must be at least 10 minutes long.");
        }
        Instant slotLowerBound = lowerBound.isBefore(now.plus(Duration.ofHours(MIN_ADVANCE_HOURS)))
                ? now.plus(Duration.ofHours(MIN_ADVANCE_HOURS)) : lowerBound;
        List<PublicAvailabilitySlotResponse> windows = repository.findPublicAvailabilityWindows(mentorId, slotLowerBound, upperBound);
        List<PublicAvailabilitySlotResponse> generated = new ArrayList<>();
        Duration duration = Duration.ofMinutes(durationMinutes);
        Duration interval = Duration.ofMinutes(SLOT_INTERVAL_MINUTES);
        for (PublicAvailabilitySlotResponse window : windows) {
            Instant start = window.startAt();
            while (!start.plus(duration).isAfter(window.endAt())) {
                Instant end = start.plus(duration);
                boolean available = !repository.existsOverlappingHold(mentorId, start, end);
                generated.add(new PublicAvailabilitySlotResponse(
                        window.id(), start, end, available, window.reason()));
                start = start.plus(interval);
            }
        }
        return generated;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
