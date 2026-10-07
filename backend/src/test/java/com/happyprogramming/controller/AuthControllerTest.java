package com.happyprogramming.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** SQL Server fixtures are transaction-scoped and rolled back, never seeded into the application. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTest {
    @org.springframework.test.context.bean.override.mockito.MockitoBean
    com.happyprogramming.service.EmailService mail;
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate db;
    @Autowired PasswordEncoder passwords;
    @Autowired ObjectMapper json;
    String email;
    String password;

    @BeforeEach void account() {
        email = "auth-test-" + UUID.randomUUID() + "@example.invalid";
        password = UUID.randomUUID() + "!Aa1";
        db.update("INSERT INTO dbo.users (email, full_name, role_code, status, password_hash) VALUES (?, ?, 'MENTEE', 'ACTIVE', ?)",
            email, "Authentication Test", passwords.encode(password));
    }
    String body(String value, String role) throws Exception {
        return json.writeValueAsString(Map.of("email", email, "password", value, "role", role));
    }

    @Test void loginPersistsSessionRotatesIdAndLogoutInvalidatesIt() throws Exception {
        var initial = new MockHttpSession();
        String oldId = initial.getId();
        var result = mvc.perform(post("/api/auth/login").session(initial).with(csrf())
            .contentType(MediaType.APPLICATION_JSON).content(body(password, "MENTEE")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.email").value(email))
            .andExpect(jsonPath("$.data.passwordHash").doesNotExist()).andReturn();
        var session = (MockHttpSession) result.getRequest().getSession(false);
        assertNotNull(session);
        assertNotEquals(oldId, session.getId());
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.role").value("MENTEE"));
        mvc.perform(post("/api/auth/logout").session(session).with(csrf())).andExpect(status().isOk());
        assertTrue(session.isInvalid());
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test void loginWithoutRoleAutoDetectsRole() throws Exception {
        mvc.perform(post("/api/auth/login").with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.email").value(email))
            .andExpect(jsonPath("$.data.role").value("MENTEE"));
    }

    @Test void sessionCsrfTokenWorksButMissingTokenCannotLogIn() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body(password, "MENTEE")))
            .andExpect(status().isForbidden());
        var result = mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andReturn();
        var token = json.readTree(result.getResponse().getContentAsString()).get("data");
        var session = (MockHttpSession) result.getRequest().getSession(false);
        mvc.perform(post("/api/auth/login").session(session)
            .header(token.get("headerName").asText(), token.get("token").asText())
            .contentType(MediaType.APPLICATION_JSON).content(body(password, "MENTEE"))).andExpect(status().isOk());
        mvc.perform(post("/api/auth/logout").session(session)
            .header(token.get("headerName").asText(), token.get("token").asText())).andExpect(status().isForbidden());
    }

    @Test void failedPasswordsLockAndCorrectPasswordCannotBypassLock() throws Exception {
        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body("incorrect-password", "MENTEE"))).andExpect(status().isUnauthorized());
        }
        // Flush the JPA transaction before observing updates through JDBC.
        entityManager.flush();
        assertEquals(5, db.queryForObject("SELECT failed_login_count FROM dbo.users WHERE email = ?", Integer.class, email));
        assertNotNull(db.queryForObject("SELECT locked_until FROM dbo.users WHERE email = ?", java.sql.Timestamp.class, email));
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(body(password, "MENTEE"))).andExpect(status().isUnauthorized());
    }
    @Autowired jakarta.persistence.EntityManager entityManager;

    @Test void wrongRoleAndInactiveAccountCannotAuthenticate() throws Exception {
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(body(password, "MENTOR"))).andExpect(status().isUnauthorized());
        db.update("UPDATE dbo.users SET status = 'INACTIVE' WHERE email = ?", email);
        entityManager.clear();
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(body(password, "MENTEE"))).andExpect(status().isUnauthorized());
    }

    @Test void expiredLockAndBcryptPrefixAllowLoginAndResetCounters() throws Exception {
        db.update("UPDATE dbo.users SET password_hash = ?, failed_login_count = 5, locked_until = DATEADD(minute, -1, SYSUTCDATETIME()) WHERE email = ?",
            "{bcrypt}" + passwords.encode(password), email);
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(body(password, "MENTEE"))).andExpect(status().isOk());
        entityManager.flush();
        assertEquals(0, db.queryForObject("SELECT failed_login_count FROM dbo.users WHERE email = ?", Integer.class, email));
        assertNull(db.queryForObject("SELECT locked_until FROM dbo.users WHERE email = ?", java.sql.Timestamp.class, email));
    }

    @Test void invalidInputsUnknownUsersAndUnconfiguredGoogleDoNotAuthenticate() throws Exception {
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(body("a".repeat(73), "MENTEE"))).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(body(password, "UNKNOWN"))).andExpect(status().isBadRequest());
        email = "missing-" + UUID.randomUUID() + "@example.invalid";
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(body(password, "MENTEE"))).andExpect(status().isUnauthorized());
        var options = mvc.perform(get("/api/auth/options")).andExpect(status().isOk()).andReturn();
        boolean googleEnabled = json.readTree(options.getResponse().getContentAsString()).path("data").path("googleEnabled").asBoolean();
        mvc.perform(post("/api/auth/google").with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"role\":\"MENTEE\"}")).andExpect(status().is(googleEnabled ? 200 : 503));
    }

    @Test void signupMenteeSucceedsAndEstablishesSession() throws Exception {
        String newEmail = "signup-" + UUID.randomUUID() + "@example.invalid";
        String signupPayload = json.writeValueAsString(Map.of(
            "firstName", "John",
            "lastName", "Doe",
            "email", newEmail,
            "password", "SecretPassword123"
        ));
        var result = mvc.perform(post("/api/auth/signup/mentee").with(csrf())
            .contentType(MediaType.APPLICATION_JSON).content(signupPayload))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.email").value(newEmail))
            .andExpect(jsonPath("$.data.requiresVerification").value(true))
            .andReturn();

        Long userId = db.queryForObject("SELECT id FROM dbo.users WHERE email = ?", Long.class, newEmail);
        assertNotNull(userId);
        assertEquals("INACTIVE", db.queryForObject("SELECT status FROM dbo.users WHERE id = ?", String.class, userId));
    }

    @Test void signupMenteeFailsOnDuplicateEmailOrWeakPassword() throws Exception {
        // Duplicate email
        String dupPayload = json.writeValueAsString(Map.of(
            "firstName", "John",
            "lastName", "Doe",
            "email", email,
            "password", "SecretPassword123"
        ));
        mvc.perform(post("/api/auth/signup/mentee").with(csrf())
            .contentType(MediaType.APPLICATION_JSON).content(dupPayload))
            .andExpect(status().isConflict());

        // Weak password (all lowercase, no uppercase)
        String weakPayload = json.writeValueAsString(Map.of(
            "firstName", "John",
            "lastName", "Doe",
            "email", "unique-" + UUID.randomUUID() + "@example.invalid",
            "password", "alllowercasepassword"
        ));
        mvc.perform(post("/api/auth/signup/mentee").with(csrf())
            .contentType(MediaType.APPLICATION_JSON).content(weakPayload))
            .andExpect(status().isBadRequest());
    }
}
