package com.happyprogramming.repository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;
class AdminPayoutHistoryTest {
 @Test void returnsAllStatusesWithDecisionMetadataAndMaskedBank() {
  var db=new JdbcTemplate(new DriverManagerDataSource("jdbc:h2:mem:payout_history;DB_CLOSE_DELAY=-1;MODE=MSSQLServer","sa",""));
  db.execute("CREATE SCHEMA dbo");
  db.execute("CREATE TABLE dbo.users(id BIGINT PRIMARY KEY,full_name VARCHAR(100),email VARCHAR(100))");
  db.execute("CREATE TABLE dbo.mentor_payout_requests(id BIGINT,mentor_id BIGINT,amount DECIMAL(18,0),fee_amount DECIMAL(18,0),bank_name VARCHAR(50),account_name VARCHAR(100),account_last4 VARCHAR(4),status VARCHAR(20),requested_at TIMESTAMP,reviewed_at TIMESTAMP,reviewed_by BIGINT,transfer_reference VARCHAR(150),rejection_reason VARCHAR(500),approved_by BIGINT,approved_at TIMESTAMP)");
  db.update("INSERT INTO dbo.users VALUES(1,'Mentor','m@example.test'),(2,'Admin','a@example.test')");
  for(int id=1;id<=3;id++) db.update("INSERT INTO dbo.mentor_payout_requests VALUES(?,1,20000,1000,'Bank','Mentor','1234',?,'2026-10-28 00:00:00',NULL,NULL,NULL,NULL,NULL,NULL)",id,new String[]{"REQUESTED","PAID","REJECTED"}[id-1]);
  db.update("UPDATE dbo.mentor_payout_requests SET reviewed_at='2026-10-28 01:00:00',reviewed_by=2,transfer_reference='BANK-2' WHERE id=2");
  db.update("UPDATE dbo.mentor_payout_requests SET rejection_reason='Incorrect destination' WHERE id=3");
  var repo=new AdminRepository(db,new ObjectMapper());
  var rows=repo.payoutHistory();
  assertEquals(java.util.List.of(3L,2L,1L),rows.stream().map(r->r.id()).toList());
  assertEquals("Incorrect destination",rows.get(0).rejectionReason());
  var paid=rows.get(1);
  assertEquals("PAID",paid.status());assertEquals("BANK-2",paid.transferReference());assertEquals("Admin",paid.reviewedBy());
  assertEquals("**** 1234",paid.accountNumber());assertEquals(new BigDecimal("19000"),paid.netAmount());
  assertEquals("2026-10-28T01:00:00Z",paid.reviewedAt().toString());
  assertNull(rows.get(2).reviewedAt());assertNull(rows.get(2).reviewedBy());
  db.update("DELETE FROM dbo.mentor_payout_requests");assertTrue(repo.payoutHistory().isEmpty());
 }
}
