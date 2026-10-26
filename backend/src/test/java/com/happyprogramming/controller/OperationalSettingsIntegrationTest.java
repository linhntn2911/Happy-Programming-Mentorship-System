package com.happyprogramming.controller;
import com.happyprogramming.dto.AuthenticatedUser;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @Transactional
class OperationalSettingsIntegrationTest {
 @Autowired MockMvc mvc; @Autowired JdbcTemplate db;
 long id; String email;
 @BeforeEach void setup(){
  email=UUID.randomUUID()+"@example.invalid";
  id=db.queryForObject("INSERT INTO dbo.users(email,full_name,role_code,status) OUTPUT INSERTED.id VALUES (?,'Settings Test','ADMIN','ACTIVE')",Long.class,email);
 }
 UsernamePasswordAuthenticationToken auth(String role){return new UsernamePasswordAuthenticationToken(new AuthenticatedUser(id,"Settings Test",email,role),null,List.of(()->"ROLE_"+role));}
 String body(boolean maintenance){return """
  {"settings":{"maintenance":%s,"announcement":"<script>literal</script>","otpResendSeconds":120,"otpExpiryMinutes":3,"withdrawalThreshold":10000,"withdrawalFee":1000,"earningsHoldDays":14},"reason":"Test operational controls"}
  """.formatted(maintenance);}
 @Test void savesReadsAndAudits() throws Exception {
  mvc.perform(put("/api/admin/operations").with(authentication(auth("ADMIN"))).with(csrf()).contentType("application/json").content(body(false))).andExpect(status().isOk());
  mvc.perform(get("/api/admin/operations").with(authentication(auth("ADMIN")))).andExpect(status().isOk()).andExpect(jsonPath("$.data.otpResendSeconds").value(120)).andExpect(jsonPath("$.data.earningsHoldDays").value(14));
  mvc.perform(get("/api/public/operations")).andExpect(status().isOk()).andExpect(jsonPath("$.data.announcement").value("<script>literal</script>"));
  assertEquals(1,db.queryForObject("SELECT COUNT(*) FROM dbo.audit_logs WHERE actor_id=? AND action='OPERATIONS_SETTINGS_CHANGED'",Integer.class,id));
 }
 @Test void requiresAdminCsrfAndValidBoundaries() throws Exception {
  mvc.perform(put("/api/admin/operations").with(authentication(auth("STAFF"))).with(csrf()).contentType("application/json").content(body(false))).andExpect(status().isForbidden());
  mvc.perform(put("/api/admin/operations").with(authentication(auth("ADMIN"))).contentType("application/json").content(body(false))).andExpect(status().isForbidden());
  mvc.perform(put("/api/admin/operations").with(authentication(auth("ADMIN"))).with(csrf()).contentType("application/json").content(body(false).replace("\"withdrawalThreshold\":10000","\"withdrawalThreshold\":9999"))).andExpect(status().isBadRequest());
  assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM dbo.audit_logs WHERE actor_id=?",Integer.class,id));
 }
 @Test void maintenanceAllowsAdminToRecoverButBlocksMembers() throws Exception {
  mvc.perform(put("/api/admin/operations").with(authentication(auth("ADMIN"))).with(csrf()).contentType("application/json").content(body(true))).andExpect(status().isOk());
  mvc.perform(get("/api/public/contact")).andExpect(status().isServiceUnavailable());
  mvc.perform(get("/api/public/operations")).andExpect(status().isOk());
  mvc.perform(get("/api/auth/options")).andExpect(status().isOk());
  mvc.perform(put("/api/admin/operations").with(authentication(auth("ADMIN"))).with(csrf()).contentType("application/json").content(body(false))).andExpect(status().isOk());
  mvc.perform(get("/api/public/contact")).andExpect(status().isOk());
 }
}
