package com.happyprogramming.controller;
import com.happyprogramming.service.AdminService;
import com.happyprogramming.dto.AuthenticatedUser;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.List;
class AdminPayoutHistoryControllerTest {
 @Test void servesHistoryUsingAuthenticatedIdentity() throws Exception {
  var service=mock(AdminService.class);
  var auth=mock(Authentication.class);
  var user=mock(AuthenticatedUser.class);
  when(auth.getPrincipal()).thenReturn(user);when(user.email()).thenReturn("admin@example.test");
  when(service.payoutHistory("admin@example.test")).thenReturn(List.of());
  MockMvcBuilders.standaloneSetup(new AdminController(service)).build()
   .perform(get("/api/admin/payout-history").principal(auth))
   .andExpect(status().isOk()).andExpect(jsonPath("$.data").isArray());
  verify(service).payoutHistory("admin@example.test");
 }
}
