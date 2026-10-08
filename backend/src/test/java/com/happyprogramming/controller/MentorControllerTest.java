package com.happyprogramming.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@org.springframework.transaction.annotation.Transactional
class MentorControllerTest {

    @Autowired private org.springframework.jdbc.core.JdbcTemplate db;
    private String slug;
    @org.junit.jupiter.api.BeforeEach void fixture() {
        slug="catalog-test-"+java.util.UUID.randomUUID();
        String email=slug+"@example.invalid";
        db.update("INSERT INTO dbo.users(email,full_name,role_code,status) VALUES (?,'Catalog Test Mentor','MENTOR','ACTIVE')",email);
        Long id=db.queryForObject("SELECT id FROM dbo.users WHERE email=?",Long.class,email);
        db.update("INSERT INTO dbo.mentor_profiles(user_id,slug,headline,job_title,company_name,biography,years_experience,is_public,approved_by,approved_at) VALUES (?,?,'Test mentor','Engineer',?, ?,7,1,?,SYSUTCDATETIME())",id,slug,slug,"A mentor created inside a rollback-only test transaction for catalog checks.",id);
    }

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldReturnFeaturedMentors() throws Exception {
        mockMvc.perform(get("/api/mentors").param("q",slug).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].id").value(slug))
                .andExpect(jsonPath("$.data[0].name").value("Catalog Test Mentor"))
                .andExpect(jsonPath("$.data[0].reviewCount").value(0));
    }

    @Test
    void shouldFilterByKeywordSkillExperiencePriceAndRating() throws Exception {
        mockMvc.perform(get("/api/mentors")
                        .param("q", slug)
                        .param("minExperience", "7")
                        .param("maxPrice", "3000000")
                        .param("minRating", "4.9")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    void shouldReturnEmptyListWhenNoMentorMatches() throws Exception {
        mockMvc.perform(get("/api/mentors").param("q", "NonExistentStack123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isEmpty());
    }
}
