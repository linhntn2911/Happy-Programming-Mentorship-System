package com.happyprogramming.service;

import com.happyprogramming.dto.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"hpms.sepay.enabled=true","hpms.sepay.api-key=integration-only-key","hpms.sepay.account-number=123456789","hpms.wallet.release.enabled=false","hpms.wallet.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="})
@Transactional
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
class SepaySettlementIntegrationTest {
 @Autowired org.springframework.test.web.servlet.MockMvc mvc;
 @Autowired JdbcTemplate db;
 @Autowired SepayPaymentService sepay;
 @Autowired MentorWalletService wallet;
 long mentor,mentee,admin,request;
 CheckoutResponse checkout;
 long user(String role) {
  String email=UUID.randomUUID()+"@example.invalid";
  db.update("INSERT INTO dbo.users(email,full_name,role_code,status) VALUES (?,'Payment Test',?,'ACTIVE')",email,role);
  return db.queryForObject("SELECT id FROM dbo.users WHERE email=?",Long.class,email);
 }
 void login(long id,String role){SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(new AuthenticatedUser(id,"Payment Test","test@example.invalid",role),null,List.of(()->"ROLE_"+role)));}
 @BeforeEach void setup(){
  mentor=user("MENTOR");mentee=user("MENTEE");admin=user("ADMIN");
  db.update("INSERT INTO dbo.mentor_profiles(user_id,slug,headline,job_title,company_name,biography,years_experience,is_public) VALUES (?,?,'Test','Engineer','Test','Payment integration test mentor biography covering reliable backend programming and secure transaction processing.',5,0)",mentor,"pay-"+UUID.randomUUID());
  long offering=db.queryForObject("INSERT INTO dbo.service_offerings(mentor_id,name,service_type,description,price,session_duration_minutes,calls_per_period,trial_days,status) OUTPUT INSERTED.id VALUES (?,'Test','MONTHLY','Test package',1000000,60,4,7,'ACTIVE')",Long.class,mentor);
  String snapshot="{\"price\":\"1000000\",\"currency\":\"VND\",\"trialDays\":7}";
  db.update("INSERT INTO dbo.mentorship_requests(mentee_id,mentor_id,service_id,experience_level,learning_goals,offer_snapshot,status,submitted_at,response_deadline,responded_at,terms_version,terms_accepted_at) SELECT ?,?,?,'BEGINNER',?,?,'PENDING',t,DATEADD(HOUR,48,t),NULL,'test',SYSUTCDATETIME() FROM (SELECT DATEADD(DAY,-10,SYSUTCDATETIME()) AS t) AS s",mentee,mentor,offering,"Learn reliable backend engineering and payment integration with tests.",snapshot);
  request=db.queryForObject("SELECT id FROM dbo.mentorship_requests WHERE mentee_id=?",Long.class,mentee);
  db.update("UPDATE dbo.mentorship_requests SET status='ACCEPTED',responded_at=DATEADD(DAY,-9,SYSUTCDATETIME()) WHERE id=?",request);
  login(mentee,"MENTEE");checkout=sepay.initiate(request);
 }
 @AfterEach void clear(){SecurityContextHolder.clearContext();}
 SepayWebhookPayload event(long id,BigDecimal amount){
  String nowStr = java.time.LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
  return new SepayWebhookPayload(id,"TestBank",nowStr,"123456789",checkout.paymentReference(),checkout.paymentReference(),"in",amount,amount,null,"REF"+id,"");
 }
 void settle(){assertTrue(sepay.processWebhook(event(912341L,new BigDecimal("1000000")),"Apikey integration-only-key").success());}
 long count(String table){return db.queryForObject("SELECT COUNT(*) FROM dbo."+table+" WHERE "+(table.equals("subscriptions")?"request_id":"payment_id")+"=?",Long.class,table.equals("subscriptions")?request:checkout.paymentId());}
 @Test
 @org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable(named="HPMS_PAYMENT_CONCURRENCY",matches="true")
 void concurrentCallbacksSettleOnceOnDedicatedDatabase() throws Exception {
  assertTrue(db.queryForObject("SELECT DB_NAME()",String.class).startsWith("HPMS_SePay_Test_"));
  org.springframework.test.context.transaction.TestTransaction.flagForCommit();
  org.springframework.test.context.transaction.TestTransaction.end();
  var executor=java.util.concurrent.Executors.newFixedThreadPool(2);
  var start=new java.util.concurrent.CountDownLatch(1);
  try {
   var futures=new java.util.ArrayList<java.util.concurrent.Future<Boolean>>();
   long eventId=100000000L+checkout.paymentId();
   for(int i=0;i<2;i++) futures.add(executor.submit(()->{start.await();return sepay.processWebhook(event(eventId,new BigDecimal("1000000")),"Apikey integration-only-key").success();}));
   start.countDown();
   for(var future:futures) assertTrue(future.get(20,java.util.concurrent.TimeUnit.SECONDS));
   assertEquals(1,count("payment_events"));assertEquals(1,count("escrow_ledger_entries"));assertEquals(1,count("subscriptions"));
  } finally {executor.shutdownNow();}
 }
 @Test void ignoresCancelledAndOtherProviderAttempts(){
  db.update("UPDATE dbo.payments SET status='CANCELLED' WHERE id=?",checkout.paymentId());
  assertFalse(sepay.processWebhook(event(912345L,new BigDecimal("1000000")),"Apikey integration-only-key").success());
  db.update("UPDATE dbo.payments SET gateway='VNPAY',status='PENDING' WHERE id=?",checkout.paymentId());
  assertFalse(sepay.processWebhook(event(912345L,new BigDecimal("1000000")),"Apikey integration-only-key").success());
  assertEquals(0,count("escrow_ledger_entries"));
 }
 @Test void webhookSecurityFiltersAllowCallbackButEnforcePrivateKey() throws Exception {
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/payments/sepay/webhook").contentType("application/json").content("{}")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/payments/sepay/webhook").header("Authorization","Apikey integration-only-key").contentType("application/json").content("{}")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest());
 }
 @Test void providerTransactionCannotFundAnotherOrder(){
  settle();
  setup();
  assertFalse(sepay.processWebhook(event(912341L,new BigDecimal("1000000")),"Apikey integration-only-key").success());
  assertEquals(0,count("escrow_ledger_entries"));assertEquals(0,count("subscriptions"));
 }
 @Test void settlesOnceAndKeepsEscrowBalanced(){
  settle();settle();
  assertEquals(1,count("payment_events"));assertEquals(1,count("escrow_ledger_entries"));assertEquals(1,count("subscriptions"));
  assertEquals("SUCCEEDED",db.queryForObject("SELECT status FROM dbo.payments WHERE id=?",String.class,checkout.paymentId()));
  login(mentor,"MENTOR");assertEquals(0,wallet.wallet().availableAmount().signum());assertTrue(wallet.wallet().heldAmount().signum()>0);
 }
 @Test void rejectsAmountMismatchAndExpiredAttemptWithoutFinancialWrites(){
  assertFalse(sepay.processWebhook(event(912342L,new BigDecimal("999999")),"Apikey integration-only-key").success());
  db.update("UPDATE dbo.payments SET expires_at=DATEADD(MILLISECOND,1,created_at) WHERE id=?",checkout.paymentId());
  String futureDate = java.time.LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).plusMinutes(5).format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
  SepayWebhookPayload expiredEvent = new SepayWebhookPayload(912342L,"TestBank",futureDate,"123456789",checkout.paymentReference(),checkout.paymentReference(),"in",new BigDecimal("1000000"),new BigDecimal("1000000"),null,"REF912342","");
  assertFalse(sepay.processWebhook(expiredEvent,"Apikey integration-only-key").success());
  assertEquals(0,count("payment_events"));assertEquals(0,count("escrow_ledger_entries"));assertEquals(0,count("subscriptions"));
 }
 void matureFixture(){
  db.update("UPDATE dbo.payments SET status='CANCELLED' WHERE id=?",checkout.paymentId());
  String ref="HISTORY-"+UUID.randomUUID();
  db.update("INSERT INTO dbo.payments(request_id,billing_cycle_no,attempt_no,gateway,merchant_reference,amount,currency,commission_rate_snapshot,status,gateway_transaction_id,created_at,paid_at,expires_at) VALUES (?,1,2,'SEPAY',?,1000000,'VND',15,'SUCCEEDED',?,DATEADD(DAY,-8,SYSUTCDATETIME()),DATEADD(DAY,-8,SYSUTCDATETIME()),DATEADD(DAY,-7,SYSUTCDATETIME()))",request,ref,ref);
  long pid=db.queryForObject("SELECT id FROM dbo.payments WHERE merchant_reference=?",Long.class,ref);
  checkout=new CheckoutResponse(pid,request,"SUCCEEDED",new BigDecimal("1000000"),"VND",ref,null,null,null);
  db.update("INSERT INTO dbo.escrow_ledger_entries(payment_id,entry_type,amount,idempotency_key) VALUES (?,'HOLD',1000000,?)",pid,"test-hold-"+pid);
 }
 @Test void pendingRefundBlocksReleaseAndCompletedRefundReducesSplit(){
  matureFixture();
  String reference="REFUND-"+UUID.randomUUID();
  db.update("INSERT INTO dbo.refunds(payment_id,refund_reference,amount,reason_code,status) VALUES (?,?,200000,'TEST','PENDING')",checkout.paymentId(),reference);
  wallet.releaseMaturedPayments();
  assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM dbo.escrow_ledger_entries WHERE payment_id=? AND entry_type='MENTOR_RELEASE'",Integer.class,checkout.paymentId()));
  db.update("UPDATE dbo.refunds SET status='SUCCEEDED',completed_at=SYSUTCDATETIME(),gateway_refund_id=? WHERE refund_reference=?",reference,reference);
  long refund=db.queryForObject("SELECT id FROM dbo.refunds WHERE refund_reference=?",Long.class,reference);
  db.update("INSERT INTO dbo.escrow_ledger_entries(payment_id,refund_id,entry_type,amount,idempotency_key) VALUES (?,?,'REFUND_OUT',200000,?)",checkout.paymentId(),refund,reference);
  wallet.releaseMaturedPayments();wallet.releaseMaturedPayments();
  login(mentor,"MENTOR");assertEquals(0,new BigDecimal("680000").compareTo(wallet.wallet().availableAmount()));
  assertEquals(0,new BigDecimal("120000").compareTo(db.queryForObject("SELECT amount FROM dbo.escrow_ledger_entries WHERE payment_id=? AND entry_type='PLATFORM_FEE'",BigDecimal.class,checkout.paymentId())));
  assertEquals(0,new BigDecimal("1000000").compareTo(db.queryForObject("SELECT SUM(amount) FROM dbo.escrow_ledger_entries WHERE payment_id=? AND entry_type IN ('MENTOR_RELEASE','PLATFORM_FEE','REFUND_OUT')",BigDecimal.class,checkout.paymentId())));
 }
 @Test void paidPayoutCannotBeWithdrawnAgain(){
  matureFixture();
  wallet.releaseMaturedPayments();wallet.releaseMaturedPayments();
  login(mentor,"MENTOR");BigDecimal net=wallet.wallet().availableAmount();assertTrue(net.signum()>0);
  var payout=wallet.requestPayout(new CreatePayoutRequest(net.setScale(0),"Test Bank","Test Owner","123456789"),"127.0.0.1");
  assertEquals(0,wallet.wallet().availableAmount().signum());
  login(admin,"ADMIN");wallet.decidePayout(payout.id(),new PayoutDecisionRequest("PAID","TEST-TRANSFER",null),"127.0.0.1");
  login(mentor,"MENTOR");assertEquals(0,wallet.wallet().availableAmount().signum());
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->wallet.requestPayout(new CreatePayoutRequest(BigDecimal.ONE,"Test Bank","Test Owner","123456789"),"127.0.0.1"));
 }
 @Test void snapshotsConfiguredHoldAtSettlement(){
  db.update("UPDATE dbo.system_configs SET config_value=JSON_MODIFY(config_value,'$.value.earningsHoldDays',14) WHERE config_key='platform.operations'");
  settle();
  assertEquals(14,db.queryForObject("SELECT earnings_hold_days FROM dbo.payments WHERE id=?",Integer.class,checkout.paymentId()));
  db.update("UPDATE dbo.system_configs SET config_value=JSON_MODIFY(config_value,'$.value.earningsHoldDays',1) WHERE config_key='platform.operations'");
  settle();
  assertEquals(14,db.queryForObject("SELECT earnings_hold_days FROM dbo.payments WHERE id=?",Integer.class,checkout.paymentId()));
 }
 @Test void payoutFeeIsDisclosedSnapshottedAndGrossDebitedOnce(){
  matureFixture();wallet.releaseMaturedPayments();login(mentor,"MENTOR");
  db.update("UPDATE dbo.system_configs SET config_value=JSON_MODIFY(config_value,'$.value.withdrawalFee',1000) WHERE config_key='platform.operations'");
  var amount=new BigDecimal("20000");var fee=new BigDecimal("1000");
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->wallet.requestPayout(new CreatePayoutRequest(amount,"Test Bank","Test Owner","123456789"),"127.0.0.1"));
  var before=wallet.wallet().availableAmount();
  var payout=wallet.requestPayout(new CreatePayoutRequest(amount,"Test Bank","Test Owner","123456789",fee),"127.0.0.1");
  assertEquals(0,fee.compareTo(payout.feeAmount()));assertEquals(0,new BigDecimal("19000").compareTo(payout.netAmount()));
  db.update("UPDATE dbo.system_configs SET config_value=JSON_MODIFY(config_value,'$.value.withdrawalFee',2000) WHERE config_key='platform.operations'");
  var saved=wallet.wallet().payoutRequests().stream().filter(p->p.id()==payout.id()).findFirst().orElseThrow();
  assertEquals(0,fee.compareTo(saved.feeAmount()));assertEquals(0,new BigDecimal("19000").compareTo(saved.netAmount()));
  login(admin,"ADMIN");
  wallet.decidePayout(payout.id(),new PayoutDecisionRequest("PAID","TEST-NET-TRANSFER",null),"127.0.0.1");
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->wallet.decidePayout(payout.id(),new PayoutDecisionRequest("PAID","TEST-NET-TRANSFER",null),"127.0.0.1"));
  login(mentor,"MENTOR");assertEquals(0,before.subtract(amount).compareTo(wallet.wallet().availableAmount()));
 }
}
