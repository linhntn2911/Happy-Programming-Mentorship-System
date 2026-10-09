package com.happyprogramming.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.service.NotificationService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class NotificationControllerTest {

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate db;
    @Autowired NotificationService notificationService;
    @Autowired EntityManager em;

    Long userId;

    @BeforeEach
    void setup() {
        String email = "notify-test-" + UUID.randomUUID() + "@example.invalid";
        db.update("INSERT INTO dbo.users(email, full_name, role_code, status) VALUES (?, 'Notify User', 'MENTEE', 'ACTIVE')", email);
        userId = db.queryForObject("SELECT id FROM dbo.users WHERE email=?", Long.class, email);
    }

    UsernamePasswordAuthenticationToken principal() {
        return new UsernamePasswordAuthenticationToken(
            new AuthenticatedUser(userId, "Notify User", "test@example.invalid", "MENTEE"),
            null,
            List.of()
        );
    }

    @Test
    void unauthenticatedAccessReturnsUnauthorized() throws Exception {
        mvc.perform(get("/api/notifications"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void listsNotificationsAndMarksRead() throws Exception {
        var n1 = notificationService.create(userId, "First Notice", "Content 1", "TEST", "#/link1");
        var n2 = notificationService.create(userId, "Second Notice", "Content 2", "TEST", "#/link2");
        em.flush();
        em.clear();

        mvc.perform(get("/api/notifications").with(authentication(principal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.unreadCount").value(2))
            .andExpect(jsonPath("$.data.notifications", hasSize(2)));

        mvc.perform(post("/api/notifications/" + n1.id() + "/read").with(authentication(principal())).with(csrf()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").value(true));

        mvc.perform(get("/api/notifications").with(authentication(principal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.unreadCount").value(1));

        mvc.perform(post("/api/notifications/read-all").with(authentication(principal())).with(csrf()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").value(1));

        mvc.perform(get("/api/notifications").with(authentication(principal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.unreadCount").value(0));
    }
}
