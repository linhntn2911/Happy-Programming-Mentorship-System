package com.happyprogramming.controller;

import com.happyprogramming.dto.PublicSupportConfig;
import com.happyprogramming.service.PublicConfigService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PublicConfigController.class)
@AutoConfigureMockMvc(addFilters = false)
class PublicConfigControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean PublicConfigService service;
    @MockitoBean com.happyprogramming.service.StaffAccessService staffAccess;

    @Test
    void exposesOnlyTheConfiguredSupportEmail() throws Exception {
        when(service.support()).thenReturn(new PublicSupportConfig("help@example.com"));
        mvc.perform(get("/api/public/support"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.supportEmail").value("help@example.com"))
                .andExpect(jsonPath("$.data.commissionRate").doesNotExist());
    }
}
