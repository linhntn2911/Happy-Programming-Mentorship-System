package com.happyprogramming.service;

import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.MentorBankAccountRequest;
import com.happyprogramming.dto.RequestPayoutOtpRequest;
import com.happyprogramming.dto.SubmitPayoutRequest;
import com.happyprogramming.entity.SecurityToken;
import com.happyprogramming.repository.SecurityTokenRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
        "hpms.wallet.release.enabled=false",
        "hpms.wallet.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="})
@Transactional
class MentorPayoutOtpIntegrationTest {
    @Autowired JdbcTemplate db;
    @Autowired MentorWalletService wallet;
    @Autowired SecurityTokenRepository securityTokens;
    @Autowired Clock clock;

    long mentor;

    void login(long id, String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(id, "Payout Test", "payout@example.invalid", role), null, List.of(() -> "ROLE_" + role)));
    }

    @BeforeEach
    void setup() {
        String email = UUID.randomUUID() + "@example.invalid";
        db.update("INSERT INTO dbo.users(email,full_name,role_code,status) VALUES (?,'Payout Test','MENTOR','ACTIVE')", email);
        mentor = db.queryForObject("SELECT id FROM dbo.users WHERE email=?", Long.class, email);
        db.update("INSERT INTO dbo.mentor_profiles(user_id,slug,headline,job_title,company_name,biography,years_experience,is_public) "
                + "VALUES (?,?,'Test','Engineer','Test','Payout integration test mentor biography covering reliable backend engineering and secure transaction processing.',5,0)",
                mentor, "payout-" + UUID.randomUUID());
        login(mentor, "MENTOR");
    }

    @AfterEach
    void clear() { SecurityContextHolder.clearContext(); }

    @Test
    void saveBankAccountEncryptsTheNumberAndMasksItOnRead() {
        var saved = wallet.saveBankAccount(new MentorBankAccountRequest("TPBank", "Nguyen Van A", "123456789"), "127.0.0.1");

        assertTrue(saved.saved());
        assertEquals("6789", saved.accountLast4());
        assertEquals("Nguyen Van A", saved.accountName());

        String ciphertext = db.queryForObject(
                "SELECT account_number_ciphertext FROM dbo.mentor_bank_accounts WHERE mentor_id=?", String.class, mentor);
        assertNotEquals("123456789", ciphertext);
        assertTrue(ciphertext.startsWith("v1:"));

        var loaded = wallet.bankAccount();
        assertTrue(loaded.saved());
        assertEquals("6789", loaded.accountLast4());
    }

    @Test
    void bankAccountIsEmptyBeforeTheMentorSavesOne() {
        assertEquals(false, wallet.bankAccount().saved());
    }

    @Test
    void requestPayoutOtpRequiresASavedBankAccount() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> wallet.requestPayoutOtp(new RequestPayoutOtpRequest(BigDecimal.TEN), "127.0.0.1"));
        assertEquals(409, error.getStatusCode().value());
    }

    @Test
    void submitPayoutRequiresASavedBankAccount() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> wallet.submitPayoutWithOtp(new SubmitPayoutRequest(BigDecimal.TEN, "123456"), "127.0.0.1"));
        assertEquals(409, error.getStatusCode().value());
    }

    @Test
    void submitPayoutRejectsWhenNoCodeWasEverRequested() {
        wallet.saveBankAccount(new MentorBankAccountRequest("TPBank", "Nguyen Van A", "123456789"), "127.0.0.1");

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> wallet.submitPayoutWithOtp(new SubmitPayoutRequest(BigDecimal.TEN, "123456"), "127.0.0.1"));
        assertEquals(400, error.getStatusCode().value());
    }

    @Test
    void submitPayoutRejectsAnInvalidCode() {
        wallet.saveBankAccount(new MentorBankAccountRequest("TPBank", "Nguyen Van A", "123456789"), "127.0.0.1");
        securityTokens.save(SecurityToken.createPayoutOtp(mentor, "246810", LocalDateTime.now(clock), 10));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> wallet.submitPayoutWithOtp(new SubmitPayoutRequest(BigDecimal.TEN, "135790"), "127.0.0.1"));
        assertEquals(400, error.getStatusCode().value());
    }

    @Test
    void submitPayoutVerifiesTheCodeBeforeEnforcingTheAvailableBalance() {
        wallet.saveBankAccount(new MentorBankAccountRequest("TPBank", "Nguyen Van A", "123456789"), "127.0.0.1");
        securityTokens.save(SecurityToken.createPayoutOtp(mentor, "246810", LocalDateTime.now(clock), 10));

        // A valid code with no released earnings must fail on balance (409), not on the code (400).
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> wallet.submitPayoutWithOtp(new SubmitPayoutRequest(BigDecimal.TEN, "246810"), "127.0.0.1"));
        assertEquals(409, error.getStatusCode().value());
    }
}
