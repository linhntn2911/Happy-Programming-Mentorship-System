package com.happyprogramming.config;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.happyprogramming.dto.*;
import com.happyprogramming.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mock.web.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class MaintenanceConfigTest {
 @Test @SuppressWarnings("unchecked") void blocksBusinessButPreservesRecoveryAndWebhook() throws Exception {
  var settings=mock(OperationalSettingsService.class);var admins=mock(AdminService.class);
  var opsProvider=mock(ObjectProvider.class);when(opsProvider.getIfAvailable()).thenReturn(settings);
  var adminProvider=mock(ObjectProvider.class);when(adminProvider.getObject()).thenReturn(admins);
  when(settings.read()).thenReturn(new OperationalSettings(true,"Work in progress"));
  var interceptor=new MaintenanceConfig(opsProvider,adminProvider,new ObjectMapper().findAndRegisterModules()).interceptor();
  var request=new MockHttpServletRequest("POST","/api/mentor/wallet/payouts");var response=new MockHttpServletResponse();
  assertFalse(interceptor.preHandle(request,response,new Object()));assertEquals(503,response.getStatus());assertEquals("60",response.getHeader("Retry-After"));
  for(String path:new String[]{"/api/auth/login","/api/auth/logout","/api/public/operations","/api/payments/sepay/webhook"})
   assertTrue(interceptor.preHandle(new MockHttpServletRequest("POST",path),new MockHttpServletResponse(),new Object()));
  assertFalse(interceptor.preHandle(new MockHttpServletRequest("POST","/api/auth/signup"),new MockHttpServletResponse(),new Object()));
  var principal=new AuthenticatedUser(1L,"Admin","admin@example.test","ADMIN");
  request.setUserPrincipal(new UsernamePasswordAuthenticationToken(principal,null,java.util.List.of()));
  when(admins.requireAdmin(principal.email())).thenReturn(new AdminDtos.Session(1,"Admin",principal.email()));
  assertTrue(interceptor.preHandle(request,new MockHttpServletResponse(),new Object()));
  when(admins.requireAdmin(principal.email())).thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));
  assertFalse(interceptor.preHandle(request,new MockHttpServletResponse(),new Object()));
  when(settings.read()).thenReturn(new OperationalSettings(false,""));
  assertTrue(interceptor.preHandle(request,new MockHttpServletResponse(),new Object()));
 }
}
