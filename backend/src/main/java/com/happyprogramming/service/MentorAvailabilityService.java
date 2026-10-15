package com.happyprogramming.service;

import com.happyprogramming.dto.MentorAvailabilitySlotRequest;
import com.happyprogramming.dto.MentorAvailabilitySlotResponse;
import com.happyprogramming.dto.PublicAvailabilitySlotResponse;
import com.happyprogramming.repository.MentorAvailabilityRepository;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
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
        return repository.findPublicSlots(mentorId, lowerBound, upperBound);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
