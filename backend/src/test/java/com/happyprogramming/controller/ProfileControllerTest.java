package com.happyprogramming.controller;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.happyprogramming.dto.AuthenticatedUser;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest @AutoConfigureMockMvc @Transactional
class ProfileControllerTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate db;
    @Autowired ObjectMapper json;
    @Autowired EntityManager em;
    Long id;
    @BeforeEach void setup() {
        String email="profile-test-"+UUID.randomUUID()+"@example.invalid";
        db.update("INSERT INTO dbo.users(email,full_name,role_code,status) VALUES (?,'Original Name','MENTEE','ACTIVE')",email);
        id=db.queryForObject("SELECT id FROM dbo.users WHERE email=?",Long.class,email);
    }
    UsernamePasswordAuthenticationToken principal() { return new UsernamePasswordAuthenticationToken(new AuthenticatedUser(id,"Original Name","test@example.invalid","MENTEE"),null,List.of()); }
    Map<String,Object> payload() { return new HashMap<>(Map.of("firstName","New","lastName","Name","bio","About me","experienceLevel","JUNIOR","learningGoals","Learn Java","githubUrl","https://github.com/example","portfolioUrl","https://example.com")); }
    @Test void savesAndReloadsOwnProfileWithoutChangingIdentity() throws Exception {
        var body=payload(); body.put("experienceLevel","FRESHER"); body.put("id",999999); body.put("email","attacker@example.invalid"); body.put("role","ADMIN");
        mvc.perform(put("/api/profile/me").with(authentication(principal())).with(csrf()).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isOk());
        em.flush(); em.clear();
        assertEquals("New Name",db.queryForObject("SELECT full_name FROM dbo.users WHERE id=?",String.class,id));
        assertEquals("MENTEE",db.queryForObject("SELECT role_code FROM dbo.users WHERE id=?",String.class,id));
        mvc.perform(get("/api/profile/me").with(authentication(principal()))).andExpect(status().isOk()).andExpect(jsonPath("$.data.learningGoals").value("Learn Java")).andExpect(jsonPath("$.data.experienceLevel").value("FRESHER")).andExpect(jsonPath("$.data.passwordHash").doesNotExist());
    }
    @Test void requiresSessionCsrfAndActiveMentee() throws Exception {
        mvc.perform(get("/api/profile/me")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/profile/me").with(authentication(principal())).contentType("application/json").content(json.writeValueAsString(payload()))).andExpect(status().isForbidden());
        db.update("UPDATE dbo.users SET status='INACTIVE' WHERE id=?",id);
        mvc.perform(get("/api/profile/me").with(authentication(principal()))).andExpect(status().isForbidden());
    }
    @Test void rejectsInvalidFieldsAndLinks() throws Exception {
        var body=payload(); body.put("githubUrl","https://github.com.evil.example/user");
        mvc.perform(put("/api/profile/me").with(authentication(principal())).with(csrf()).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
        body=payload();body.put("firstName"," ");
        mvc.perform(put("/api/profile/me").with(authentication(principal())).with(csrf()).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
        body=payload();body.put("experienceLevel","ADMIN");
        mvc.perform(put("/api/profile/me").with(authentication(principal())).with(csrf()).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
    }
    @Test void avatarPersistsIsPrivateAndCanBeRemoved() throws Exception {
        var output=new ByteArrayOutputStream(); ImageIO.write(new BufferedImage(2,2,BufferedImage.TYPE_INT_RGB),"png",output);
        mvc.perform(put("/api/profile/me/avatar").with(authentication(principal())).with(csrf()).contentType("application/json").content(json.writeValueAsString(Map.of("base64",Base64.getEncoder().encodeToString(output.toByteArray()))))).andExpect(status().isOk()).andExpect(jsonPath("$.data.hasAvatar").value(true));
        em.flush(); em.clear();
        mvc.perform(get("/api/profile/me/avatar").with(authentication(principal()))).andExpect(status().isOk()).andExpect(content().contentTypeCompatibleWith("image/png")).andExpect(header().string("Cache-Control","no-store"));
        mvc.perform(get("/api/profile/me/avatar")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/profile/me/avatar").with(authentication(principal())).with(csrf()).contentType("application/json").content("{\"base64\":\"bm90IGFuIGltYWdl\"}")).andExpect(status().isBadRequest());
        mvc.perform(delete("/api/profile/me/avatar").with(authentication(principal())).with(csrf())).andExpect(status().isOk()).andExpect(jsonPath("$.data.hasAvatar").value(false));
        em.flush(); em.clear();
        mvc.perform(get("/api/profile/me/avatar").with(authentication(principal()))).andExpect(status().isNotFound());
    }

    @Test void publicMentorUsesOnlyOwnedAvatarAndHasNoInventedReviews() throws Exception {
        String slug="avatar-test-"+id;
        db.update("INSERT INTO dbo.mentor_profiles(user_id,slug,headline,job_title,biography,years_experience,is_public,approved_by,approved_at) VALUES (?,?,'Test mentor','Engineer',?,2,1,?,SYSUTCDATETIME())",id,slug,"A mentor profile created solely for testing avatar and rating integrity.",id);
        mvc.perform(get("/api/mentors").param("q",slug)).andExpect(status().isOk());
        var catalog = new com.happyprogramming.service.MentorCatalog(db);
        var card=catalog.allMentors().stream().filter(m -> m.id().equals(slug)).findFirst().orElseThrow();
        assertNull(card.portrait()); assertEquals(0,card.rating()); assertEquals(0,card.reviewCount());
        mvc.perform(get("/api/mentors/"+slug+"/avatar")).andExpect(status().isNotFound());
        var output=new ByteArrayOutputStream(); ImageIO.write(new BufferedImage(2,2,BufferedImage.TYPE_INT_RGB),"png",output);
        mvc.perform(put("/api/profile/me/avatar").with(authentication(principal())).with(csrf()).contentType("application/json").content(json.writeValueAsString(Map.of("base64",Base64.getEncoder().encodeToString(output.toByteArray()))))).andExpect(status().isOk());
        em.flush(); em.clear();
        assertEquals("/api/mentors/"+slug+"/avatar",catalog.allMentors().stream().filter(m -> m.id().equals(slug)).findFirst().orElseThrow().portrait());
        mvc.perform(get("/api/mentors/"+slug+"/avatar")).andExpect(status().isOk()).andExpect(content().contentTypeCompatibleWith("image/png"));
        db.update("UPDATE dbo.mentor_profiles SET is_public=0 WHERE user_id=?",id);
        mvc.perform(get("/api/mentors/"+slug+"/avatar")).andExpect(status().isNotFound());
    }
}
