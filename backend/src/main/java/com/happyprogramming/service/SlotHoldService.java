package com.happyprogramming.service;

import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.HoldSlotRequest;
import com.happyprogramming.dto.SlotHoldResponse;
import com.happyprogramming.repository.MentorAvailabilityRepository;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Temporary slot reservation for one-off sessions. Hold duration and advance-booking minimum are
 * fixed by the SRS: BR-10 (a hold expires 10 minutes after it is created) and BR-11 (a session must
 * be booked at least 2 hours before its start time). Overlap checks run under SERIALIZABLE isolation
 * with lock hints so two mentees cannot hold the same time.
 */
@Service
public class SlotHoldService {
    static final int HOLD_MINUTES = 10;
    static final int MIN_ADVANCE_HOURS = 2;

    private final MentorAvailabilityRepository repository;
    private final Clock clock;

    public SlotHoldService(
            MentorAvailabilityRepository repository,
            @Autowired(required = false) Clock clock) {
        this.repository = repository;
        this.clock = clock != null ? clock : Clock.systemUTC();
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public SlotHoldResponse holdSlot(HoldSlotRequest request) {
        AuthenticatedUser user = currentUser();
        if (user == null || user.id() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in to hold a session slot.");
        }
        if (user.roles() == null || !user.roles().contains("MENTEE")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only mentees can hold a session slot.");
        }
        long menteeId = user.id();

        Map<String, Object> mentor = repository.findPublicMentorBySlug(request.mentorSlug());
        if (mentor == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Mentor is not available for one-off sessions.");
        }
        long mentorId = ((Number) mentor.get("user_id")).longValue();
        if (mentorId == menteeId) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot hold a session with yourself.");
        }

        Map<String, Object> offering =
                repository.findActiveOneOffOffering(request.serviceOfferingId(), mentorId);
        if (offering == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The selected session is no longer available. Refresh the mentor profile and choose an active session.");
        }
        int durationMinutes = offering.get("session_duration_minutes") == null
                ? 0 : ((Number) offering.get("session_duration_minutes")).intValue();
        if (durationMinutes <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This session does not define a valid duration.");
        }

        Instant startAt = request.startAt();
        Instant earliest = Instant.now(clock).plus(Duration.ofHours(MIN_ADVANCE_HOURS));
        if (startAt.isBefore(earliest)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Sessions must be booked at least " + MIN_ADVANCE_HOURS + " hours in advance.");
        }
        Instant endAt = startAt.plus(Duration.ofMinutes(durationMinutes));

        if (!repository.isWithinOpenSlot(mentorId, startAt, endAt)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The selected time is outside the mentor's published availability.");
        }
        if (repository.existsOverlappingHold(mentorId, startAt, endAt)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "That time was just taken. Please pick another slot.");
        }

        long holdId = repository.insertHold(mentorId, menteeId, request.serviceOfferingId(), startAt, endAt, HOLD_MINUTES);
        SlotHoldResponse hold = repository.findHold(holdId);
        if (hold == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Slot hold could not be created.");
        }
        return hold;
    }

    @Transactional
    public void releaseSlot(long holdId) {
        AuthenticatedUser user = currentUser();
        if (user == null || user.id() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in to release a session slot.");
        }
        if (user.roles() == null || !user.roles().contains("MENTEE")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only mentees can release a session slot.");
        }
        if (repository.releaseHold(holdId, user.id()) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Active slot hold not found.");
        }
    }

    private static AuthenticatedUser currentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user) {
            return user;
        }
        return null;
    }
}
