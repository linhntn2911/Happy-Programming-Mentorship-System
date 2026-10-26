package com.happyprogramming.service;
import com.happyprogramming.dto.OperationalSettings;
import com.happyprogramming.entity.SecurityToken;
import com.happyprogramming.repository.SecurityTokenRepository;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class OperationalPolicyTest {
 @Test void withdrawalThresholdIsExclusiveAndWholeVnd(){
  var config=new OperationalSettings(false,"");
  for(String value:new String[]{"0","9999","10000","10000.5"})
   assertThrows(org.springframework.web.server.ResponseStatusException.class,()->OperationalPolicy.validateWithdrawal(new BigDecimal(value),config));
  assertDoesNotThrow(()->OperationalPolicy.validateWithdrawal(new BigDecimal("10001"),config));
  var raised=new OperationalSettings(false,"",60,10,new BigDecimal("50000"),new BigDecimal("1000"),14);
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->OperationalPolicy.validateWithdrawal(new BigDecimal("50000"),raised));
  assertDoesNotThrow(()->OperationalPolicy.validateWithdrawal(new BigDecimal("50001"),raised));
 }
 @Test void resendBoundaryIncludesUsedTokens(){
  var repo=mock(SecurityTokenRepository.class);
  var service=new OperationalPolicy(mock(OperationalSettingsService.class),repo);
  var now=LocalDateTime.of(2026,10,23,12,0);
  var token=SecurityToken.createVerifyEmail(1L,"123456",now,3);token.markUsed(now.plusSeconds(10));
  when(repo.findFirstByUserIdAndPurposeOrderByCreatedAtDesc(1L,"VERIFY_EMAIL")).thenReturn(Optional.of(token));
  assertTrue(service.coolingDown(1,"VERIFY_EMAIL",now.plusSeconds(119),120));
  assertFalse(service.coolingDown(1,"VERIFY_EMAIL",now.plusSeconds(120),120));
 }
 @Test void issuedCodeKeepsItsExpiry(){
  var now=LocalDateTime.of(2026,10,23,12,0);
  var token=SecurityToken.createPayoutOtp(1L,"123456",now,3);
  assertTrue(token.isValid(now.plusMinutes(3).minusNanos(1)));
  assertFalse(token.isValid(now.plusMinutes(3)));
 }
 @Test void authResendUsesConfiguredExpiryAndCooldown(){
  var users=mock(com.happyprogramming.repository.UserRepository.class);
  var tokens=mock(SecurityTokenRepository.class);var mail=mock(EmailService.class);
  var encoder=mock(org.springframework.security.crypto.password.PasswordEncoder.class);
  var clock=java.time.Clock.fixed(java.time.Instant.parse("2026-10-23T12:00:00Z"),java.time.ZoneOffset.UTC);
  var auth=new AuthService(users,mock(com.happyprogramming.repository.AuthIdentityRepository.class),tokens,mail,encoder,clock);
  var settings=mock(OperationalSettingsService.class);
  when(settings.read()).thenReturn(new OperationalSettings(false,"",120,3,new BigDecimal("10000"),BigDecimal.ZERO,7));
  auth.operationalPolicy=new OperationalPolicy(settings,tokens);
  var user=mock(com.happyprogramming.entity.User.class);
  when(user.getId()).thenReturn(1L);when(user.getEmail()).thenReturn("otp@example.invalid");when(user.getStatus()).thenReturn("INACTIVE");
  when(users.findForLogin("otp@example.invalid")).thenReturn(Optional.of(user));
  when(tokens.findFirstByUserIdAndPurposeOrderByCreatedAtDesc(1L,"VERIFY_EMAIL")).thenReturn(Optional.empty());
  auth.resendOtp("otp@example.invalid");
  var saved=org.mockito.ArgumentCaptor.forClass(SecurityToken.class);verify(tokens).save(saved.capture());
  assertEquals(LocalDateTime.of(2026,10,23,12,3),saved.getValue().getExpiresAt());
  verify(mail).sendOtpEmail(eq("otp@example.invalid"),isNull(),anyString(),eq(3));
  clearInvocations(tokens,mail);
  when(tokens.findFirstByUserIdAndPurposeOrderByCreatedAtDesc(1L,"VERIFY_EMAIL")).thenReturn(Optional.of(saved.getValue()));
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->auth.resendOtp("otp@example.invalid"));
  verify(tokens,never()).save(any());verifyNoInteractions(mail);
 }
}
