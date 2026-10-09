package com.happyprogramming.controller;

import com.happyprogramming.dto.AuthenticatedUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class StaffControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private UsernamePasswordAuthenticationToken staffPrincipal() {
        AuthenticatedUser user = new AuthenticatedUser(10L, "Operational Staff", "staff@happyprogramming.vn", "STAFF");
        return new UsernamePasswordAuthenticationToken(user, null, List.of(() -> "ROLE_STAFF"));
    }

    @Test
    void shouldReturnSkillsAndCategoriesForStaff() throws Exception {
        mockMvc.perform(get("/api/staff/skills").with(authentication(staffPrincipal())).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());

        mockMvc.perform(get("/api/staff/skill-categories").with(authentication(staffPrincipal())).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }
}
