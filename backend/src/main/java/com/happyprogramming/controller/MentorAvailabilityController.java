package com.happyprogramming.controller;

import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.HoldSlotRequest;
import com.happyprogramming.dto.MentorAvailabilitySlotRequest;
import com.happyprogramming.dto.MentorAvailabilitySlotResponse;
import com.happyprogramming.dto.PublicAvailabilitySlotResponse;
import com.happyprogramming.dto.SlotHoldResponse;
import com.happyprogramming.service.MentorAvailabilityService;
import com.happyprogramming.service.SlotHoldService;

import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@CrossOrigin(origins = "*")
public class MentorAvailabilityController {
    private final MentorAvailabilityService availabilityService;
    private final SlotHoldService slotHoldService;

    public MentorAvailabilityController(
            MentorAvailabilityService availabilityService,
            SlotHoldService slotHoldService) {
        this.availabilityService = availabilityService;
        this.slotHoldService = slotHoldService;
    }

    @GetMapping("/api/mentors/me/availability")
    public ApiResponse<List<MentorAvailabilitySlotResponse>> getMyAvailability() {
        return ApiResponse.ok(availabilityService.listMySlots());
    }

    @PostMapping("/api/mentors/me/availability")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MentorAvailabilitySlotResponse> createSlot(
            @Valid @RequestBody MentorAvailabilitySlotRequest request) {
        return ApiResponse.ok("Availability slot published.", availabilityService.createSlot(request));
    }

    @DeleteMapping("/api/mentors/me/availability/{slotId}")
    public ApiResponse<Void> deleteSlot(@PathVariable long slotId) {
        availabilityService.deleteSlot(slotId);
        return ApiResponse.ok("Availability slot removed.", null);
    }

    @GetMapping("/api/mentors/{identifier}/availability")
    public ApiResponse<List<PublicAvailabilitySlotResponse>> getMentorAvailability(
            @PathVariable String identifier,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        return ApiResponse.ok(availabilityService.listPublicSlots(identifier, from, to));
    }

    @PostMapping("/api/slot-holds")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<SlotHoldResponse> holdSlot(@Valid @RequestBody HoldSlotRequest request) {
        return ApiResponse.ok("Slot held for 10 minutes.", slotHoldService.holdSlot(request));
    }

    @DeleteMapping("/api/slot-holds/{holdId}")
    public ApiResponse<Void> releaseSlot(@PathVariable long holdId) {
        slotHoldService.releaseSlot(holdId);
        return ApiResponse.ok("Slot released.", null);
    }
}
