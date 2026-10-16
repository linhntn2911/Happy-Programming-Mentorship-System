package com.happyprogramming.controller;

import com.happyprogramming.dto.MentorAvailabilitySlotResponse;
import com.happyprogramming.dto.PublicAvailabilitySlotResponse;
import com.happyprogramming.dto.SlotHoldResponse;
import com.happyprogramming.service.MentorAvailabilityService;
import com.happyprogramming.service.SlotHoldService;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MentorAvailabilityController.class)
@AutoConfigureMockMvc(addFilters = false)
class MentorAvailabilityControllerTest {
    @MockitoBean
    private com.happyprogramming.service.StaffAccessService staffAccess;
    @MockitoBean
    private MentorAvailabilityService availability;
    @MockitoBean
    private SlotHoldService slotHolds;
    @Autowired
    private MockMvc mockMvc;

    private static MentorAvailabilitySlotResponse slot() {
        return new MentorAvailabilitySlotResponse(4L, Instant.parse("2026-10-20T10:00:00Z"),
                Instant.parse("2026-10-20T12:00:00Z"), "Open", Instant.parse("2026-10-15T02:00:00Z"));
    }

    @Test
    void getMyAvailabilityReturnsPublishedSlots() throws Exception {
        when(availability.listMySlots()).thenReturn(List.of(slot()));

        mockMvc.perform(get("/api/mentors/me/availability").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(4))
                .andExpect(jsonPath("$.data[0].startAt").value("2026-10-20T10:00:00Z"));
    }

    @Test
    void createSlotReturnsCreated() throws Exception {
        when(availability.createSlot(ArgumentMatchers.any())).thenReturn(slot());

        mockMvc.perform(post("/api/mentors/me/availability")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"startAt\":\"2026-10-20T10:00:00Z\",\"endAt\":\"2026-10-20T12:00:00Z\",\"reason\":\"Open\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").value(4));
    }

    @Test
    void createSlotRejectsMissingStart() throws Exception {
        mockMvc.perform(post("/api/mentors/me/availability")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"endAt\":\"2026-10-20T12:00:00Z\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deleteSlotReturnsOk() throws Exception {
        mockMvc.perform(delete("/api/mentors/me/availability/4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void getMentorAvailabilityReturnsPublicSlots() throws Exception {
        when(availability.listPublicSlots(ArgumentMatchers.eq("jane"), ArgumentMatchers.any(), ArgumentMatchers.any()))
                .thenReturn(List.of(new PublicAvailabilitySlotResponse(9L,
                        Instant.parse("2026-10-20T10:00:00Z"), Instant.parse("2026-10-20T12:00:00Z"), true)));

        mockMvc.perform(get("/api/mentors/jane/availability").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(9))
                .andExpect(jsonPath("$.data[0].available").value(true));
    }

    @Test
    void holdSlotReturnsCreated() throws Exception {
        when(slotHolds.holdSlot(ArgumentMatchers.any())).thenReturn(new SlotHoldResponse(7L, 3L, 5L,
                Instant.parse("2026-10-20T10:00:00Z"), Instant.parse("2026-10-20T11:00:00Z"),
                Instant.parse("2026-10-15T02:10:00Z"), "HELD"));

        mockMvc.perform(post("/api/slot-holds")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"mentorSlug\":\"jane\",\"serviceOfferingId\":5,\"startAt\":\"2026-10-20T10:00:00Z\",\"numberOfSessions\":2}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").value(7))
                .andExpect(jsonPath("$.data.status").value("HELD"));
    }

    @Test
    void holdSlotRejectsMissingFields() throws Exception {
        mockMvc.perform(post("/api/slot-holds")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void releaseSlotReturnsOk() throws Exception {
        mockMvc.perform(delete("/api/slot-holds/7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
