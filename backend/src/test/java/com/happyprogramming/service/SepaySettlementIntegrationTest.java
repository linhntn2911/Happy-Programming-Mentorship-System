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
 @Autowired DisputeService disputes;
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
  approveAsStaff(payout.id());wallet.decidePayout(payout.id(),new PayoutDecisionRequest("PAID","TEST-TRANSFER",null),"127.0.0.1");
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
  approveAsStaff(payout.id());
  wallet.decidePayout(payout.id(),new PayoutDecisionRequest("PAID","TEST-NET-TRANSFER",null),"127.0.0.1");
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->wallet.decidePayout(payout.id(),new PayoutDecisionRequest("PAID","TEST-NET-TRANSFER",null),"127.0.0.1"));
  login(mentor,"MENTOR");assertEquals(0,before.subtract(amount).compareTo(wallet.wallet().availableAmount()));
 }
 @Test void staffRejectionReleasesReservationWithoutApprovalOrDebit() {
  matureFixture();wallet.releaseMaturedPayments();login(mentor,"MENTOR");
  var before=wallet.wallet().availableAmount();
  var payout=wallet.requestPayout(new CreatePayoutRequest(new BigDecimal("20000"),"Bank","Owner","123456789"),"local");
  login(user("STAFF"),"STAFF");
  wallet.reviewStaffPayout(payout.id(),new PayoutDecisionRequest("REJECTED",null,"Invalid destination"),"local");
  login(mentor,"MENTOR");assertEquals(0,before.compareTo(wallet.wallet().availableAmount()));
  assertNull(db.queryForObject("SELECT approved_by FROM dbo.mentor_payout_requests WHERE id=?",Long.class,payout.id()));
  assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM dbo.escrow_ledger_entries WHERE payout_request_id=?",Integer.class,payout.id()));
 }
 @Test void lockedStaffCannotApproveAndApproverCannotPayAfterBecomingAdmin() {
  matureFixture();wallet.releaseMaturedPayments();login(mentor,"MENTOR");
  var payout=wallet.requestPayout(new CreatePayoutRequest(new BigDecimal("20000"),"Bank","Owner","123456789"),"local");
  long staff=user("STAFF");login(staff,"STAFF");
  db.update("UPDATE dbo.users SET locked_until=DATEADD(HOUR,1,SYSUTCDATETIME()) WHERE id=?",staff);
  var denied=assertThrows(org.springframework.web.server.ResponseStatusException.class,()->wallet.reviewStaffPayout(payout.id(),new PayoutDecisionRequest("APPROVED",null,null),"local"));
  assertEquals(403,denied.getStatusCode().value());
  db.update("UPDATE dbo.users SET locked_until=NULL WHERE id=?",staff);
  wallet.reviewStaffPayout(payout.id(),new PayoutDecisionRequest("APPROVED",null,null),"local");
  db.update("UPDATE dbo.users SET role_code='ADMIN' WHERE id=?",staff);login(staff,"ADMIN");
  var self=assertThrows(org.springframework.web.server.ResponseStatusException.class,()->wallet.decidePayout(payout.id(),new PayoutDecisionRequest("PAID","SELF",null),"local"));
  assertEquals(409,self.getStatusCode().value());
  assertEquals("APPROVED",db.queryForObject("SELECT status FROM dbo.mentor_payout_requests WHERE id=?",String.class,payout.id()));
 }
 @Test void mergedStaffRefundApprovalHoldsFundsUntilAdminRecordsTransfer() {
  matureFixture();
  db.update("UPDATE dbo.payments SET billing_period_start=paid_at,billing_period_end=DATEADD(MONTH,1,paid_at) WHERE id=?",checkout.paymentId());
  db.update("UPDATE r SET funded_at=p.paid_at FROM dbo.mentorship_requests r JOIN dbo.payments p ON p.request_id=r.id WHERE p.id=?",checkout.paymentId());
  db.update("""
    INSERT INTO dbo.subscriptions(request_id,service_id,mentor_id,mentee_id,agreed_price,plan_snapshot,status,
      activated_at,trial_ends_at,current_period_start,current_period_end)
    SELECT r.id,r.service_id,r.mentor_id,r.mentee_id,1000000,r.offer_snapshot,'TRIALING',
      p.paid_at,DATEADD(DAY,7,p.paid_at),p.billing_period_start,p.billing_period_end
    FROM dbo.mentorship_requests r JOIN dbo.payments p ON p.request_id=r.id WHERE p.id=?
    """,checkout.paymentId());
  long subscription=db.queryForObject("SELECT id FROM dbo.subscriptions WHERE request_id=?",Long.class,request);
  long dispute=db.queryForObject("""
    INSERT INTO dbo.disputes(ticket_code,complainant_id,respondent_id,subscription_id,payment_id,
      target_type,previous_target_status,category,description,disputed_amount,terms_accepted_at)
    OUTPUT INSERTED.id VALUES (?,?,?, ?,?,'MONTHLY','TRIALING','OTHER',?,1000000,SYSUTCDATETIME())
    """,Long.class,"MERGE-"+UUID.randomUUID().toString().substring(0,24),mentee,mentor,subscription,checkout.paymentId(),
    "Integration test of staff approval and administrator refund settlement.");
  db.update("UPDATE dbo.subscriptions SET status='DISPUTED' WHERE id=?",subscription);
  long staff=user("STAFF");login(staff,"STAFF");
  var actor=new AuthenticatedUser(staff,"Staff","staff@example.invalid","STAFF");
  disputes.staffResolve(dispute,new StaffDisputeDtos.ResolveRequest("FULL_REFUND","Approved after reviewing the evidence",null,"Test Bank","123456789","TEST MENTEE"),actor,"local");
  assertEquals("APPROVED",db.queryForObject("SELECT status FROM dbo.disputes WHERE id=?",String.class,dispute));
  wallet.releaseMaturedPayments();
  assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM dbo.escrow_ledger_entries WHERE payment_id=? AND entry_type='MENTOR_RELEASE'",Integer.class,checkout.paymentId()));
  String receipt="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1kAAAAASUVORK5CYII=";
  var decision=new RefundDecisionRequest("PAID","MERGE-REFUND-TEST",null,null,null,null,"receipt.png",receipt,"image/png");
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->disputes.adminDecideRefund(dispute,decision,actor,"local"));
  login(admin,"ADMIN");var adminActor=new AuthenticatedUser(admin,"Admin","admin@example.invalid","ADMIN");
  var tooLong=new RefundDecisionRequest("PAID","R".repeat(101),null,null,null,null);
  assertEquals(400,assertThrows(org.springframework.web.server.ResponseStatusException.class,
    ()->disputes.adminDecideRefund(dispute,tooLong,adminActor,"local")).getStatusCode().value());
  assertEquals("APPROVED",db.queryForObject("SELECT status FROM dbo.disputes WHERE id=?",String.class,dispute));
  var invalidReceipt=new RefundDecisionRequest("PAID","BAD-RECEIPT",null,null,null,null,"fake.png",Base64.getEncoder().encodeToString("not an image".getBytes()),"image/png");
  assertEquals(400,assertThrows(org.springframework.web.server.ResponseStatusException.class,()->disputes.adminDecideRefund(dispute,invalidReceipt,adminActor,"local")).getStatusCode().value());
  disputes.adminDecideRefund(dispute,decision,adminActor,"local");
  login(mentee,"MENTEE");
  assertArrayEquals(Base64.getDecoder().decode(receipt),disputes.downloadReceipt(dispute).content());
  login(user("MENTEE"),"MENTEE");
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->disputes.downloadReceipt(dispute));
  login(admin,"ADMIN");
  assertEquals("RESOLVED",db.queryForObject("SELECT status FROM dbo.disputes WHERE id=?",String.class,dispute));
  assertEquals(1,db.queryForObject("SELECT COUNT(*) FROM dbo.escrow_ledger_entries WHERE payment_id=? AND entry_type='REFUND_OUT'",Integer.class,checkout.paymentId()));
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->disputes.adminDecideRefund(dispute,decision,adminActor,"local"));
 }
 void approveAsStaff(long payoutId) {
  long staff=user("STAFF");login(staff,"STAFF");
  wallet.decidePayout(payoutId,new PayoutDecisionRequest("APPROVED",null,null),"127.0.0.1");
  login(admin,"ADMIN");
 }
 @Test void staffApprovalRetainsReservationAndAdminCannotSkipIt() {
  matureFixture();wallet.releaseMaturedPayments();login(mentor,"MENTOR");
  var payout=wallet.requestPayout(new CreatePayoutRequest(new BigDecimal("20000"),"Bank","Owner","123456789"),"local");
  var available=wallet.wallet().availableAmount();
  login(admin,"ADMIN");
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->wallet.decidePayout(payout.id(),new PayoutDecisionRequest("PAID","REF",null),"local"));
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->wallet.decidePayout(payout.id(),new PayoutDecisionRequest("APPROVED",null,null),"local"));
  long staff=user("STAFF");login(staff,"STAFF");
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->wallet.decidePayout(payout.id(),new PayoutDecisionRequest("PAID","REF",null),"local"));
  wallet.decidePayout(payout.id(),new PayoutDecisionRequest("APPROVED",null,null),"local");
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->wallet.decidePayout(payout.id(),new PayoutDecisionRequest("APPROVED",null,null),"local"));
  login(mentor,"MENTOR");assertEquals(0,available.compareTo(wallet.wallet().availableAmount()));
  assertEquals(staff,db.queryForObject("SELECT approved_by FROM dbo.mentor_payout_requests WHERE id=?",Long.class,payout.id()));
  assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM dbo.escrow_ledger_entries WHERE payout_request_id=?",Integer.class,payout.id()));
  login(admin,"ADMIN");wallet.decidePayout(payout.id(),new PayoutDecisionRequest("REJECTED",null,"Destination requires correction"),"local");
  login(mentor,"MENTOR");assertEquals(0,available.add(new BigDecimal("20000")).compareTo(wallet.wallet().availableAmount()));
 }
}
