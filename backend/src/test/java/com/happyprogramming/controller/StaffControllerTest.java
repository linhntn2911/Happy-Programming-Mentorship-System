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

    @Autowired private org.springframework.jdbc.core.JdbcTemplate db;
    private UsernamePasswordAuthenticationToken staffPrincipal() {
        String email="staff-test-"+java.util.UUID.randomUUID()+"@example.invalid";
        db.update("INSERT INTO dbo.users(email,full_name,role_code,status) VALUES (?,'Staff Test','STAFF','ACTIVE')",email);
        Long id=db.queryForObject("SELECT id FROM dbo.users WHERE email=?",Long.class,email);
        String adminEmail="admin-"+email;
        db.update("INSERT INTO dbo.users(email,full_name,role_code,status) VALUES (?,'Test Admin','ADMIN','ACTIVE')",adminEmail);
        Long adminId=db.queryForObject("SELECT id FROM dbo.users WHERE email=?",Long.class,adminEmail);
        db.update("INSERT INTO dbo.user_permissions(user_id,permission_code,assigned_by) VALUES (?,'SKILL_MANAGE',?)",id,adminId);
        AuthenticatedUser user = new AuthenticatedUser(id, "Operational Staff", email, "STAFF");
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
