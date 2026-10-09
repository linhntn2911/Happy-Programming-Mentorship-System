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
class MentorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldReturnFeaturedMentors() throws Exception {
        mockMvc.perform(get("/api/mentors").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].id").value("hoang-nam"))
                .andExpect(jsonPath("$.data[0].name").value("Hoang Nam Le"));
    }

    @Test
    void shouldFilterByKeywordSkillExperiencePriceAndRating() throws Exception {
        mockMvc.perform(get("/api/mentors")
                        .param("q", "VNG")
                        .param("skills", "Python")
                        .param("minExperience", "7")
                        .param("maxPrice", "3000000")
                        .param("minRating", "4.9")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value("hoang-nam"));
    }

    @Test
    void shouldReturnEmptyListWhenNoMentorMatches() throws Exception {
        mockMvc.perform(get("/api/mentors").param("q", "NonExistentStack123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isEmpty());
    }
}
