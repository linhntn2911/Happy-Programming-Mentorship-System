package com.happyprogramming.controller;

import com.happyprogramming.config.SecurityConfig;
import com.happyprogramming.dto.PublicContactResponse;
import com.happyprogramming.service.AuthService;
import com.happyprogramming.service.StaffAccessService;
import com.happyprogramming.service.PublicContactService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;

@WebMvcTest(PublicContactController.class)
@Import(SecurityConfig.class)
class PublicContactControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean PublicContactService service;
    @MockitoBean AuthService auth;
    @MockitoBean StaffAccessService staffAccess;

    @Test void anonymousContactContainsOnlyPublicAddress() throws Exception {
        when(service.contact()).thenReturn(new PublicContactResponse("help@example.com"));
        mvc.perform(get("/api/public/contact")).andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.data.supportEmail").value("help@example.com"))
            .andExpect(jsonPath("$.data.length()").value(1));
    }
    @Test void unavailableContactDoesNotExposeInternalFailure() throws Exception {
        when(service.contact()).thenThrow(new IllegalStateException("private database details"));
        mvc.perform(get("/api/public/contact")).andExpect(status().isServiceUnavailable())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.message").value("Support contact is temporarily unavailable. Please try again."));
    }
    @Test void publicReadDoesNotUnlockAdminOrWrites() throws Exception {
        mvc.perform(get("/api/admin/settings")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/admin/settings").with(user("staff").roles("STAFF")).with(csrf()))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/public/contact").with(csrf())).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }
}
