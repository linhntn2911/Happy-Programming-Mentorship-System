package com.happyprogramming.service;

import com.happyprogramming.dto.AdminPayoutRequest;
import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.CreatePayoutRequest;
import com.happyprogramming.dto.MentorBankAccountRequest;
import com.happyprogramming.dto.MentorBankAccountResponse;
import com.happyprogramming.dto.MentorWalletResponse;
import com.happyprogramming.dto.PayoutDecisionRequest;
import com.happyprogramming.dto.PayoutOtpResponse;
import com.happyprogramming.dto.RequestPayoutOtpRequest;
import com.happyprogramming.dto.SubmitPayoutRequest;
import com.happyprogramming.entity.SecurityToken;
import com.happyprogramming.repository.SecurityTokenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class MentorWalletService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int PAYOUT_OTP_EXPIRY_MINUTES = 10;
    private final JdbcTemplate jdbc;
    private final String encryptionKey;
    private final SecurityTokenRepository securityTokens;
    private final EmailService emailService;
    private final Clock clock;

    public MentorWalletService(@Autowired(required = false) JdbcTemplate jdbc,
                               @Value("${hpms.wallet.encryption-key:}") String encryptionKey,
                               SecurityTokenRepository securityTokens,
                               EmailService emailService,
                               Clock clock) {
        this.jdbc = jdbc;
        this.encryptionKey = encryptionKey;
        this.securityTokens = securityTokens;
        this.emailService = emailService;
        this.clock = clock;
    }

    @Transactional
    public MentorWalletResponse wallet() {
        long mentorId = requireRole("MENTOR");
        JdbcTemplate db = db();
        releaseMatured(db, 100);
        BigDecimal held = heldBalance(db, mentorId);
        BigDecimal available = releasedBalance(db, mentorId).subtract(paidBalance(db, mentorId)).subtract(reservedBalance(db, mentorId, null));
        BigDecimal reserved = reservedBalance(db, mentorId, null);
        BigDecimal paid = paidBalance(db, mentorId);
        var entries = db.query("""
                SELECT TOP (50) e.id,e.entry_type,e.amount,p.merchant_reference,e.created_at
                FROM dbo.escrow_ledger_entries e
                JOIN dbo.payments p ON p.id=e.payment_id
                JOIN dbo.mentorship_requests r ON r.id=p.request_id
                WHERE r.mentor_id=? AND e.entry_type IN ('MENTOR_RELEASE','PLATFORM_FEE','MENTOR_PAYOUT')
                ORDER BY e.created_at DESC,e.id DESC
                """, (rs, n) -> new MentorWalletResponse.Entry(rs.getLong("id"), rs.getString("entry_type"),
                rs.getBigDecimal("amount"), rs.getString("merchant_reference"), rs.getTimestamp("created_at").toInstant()), mentorId);
        var requests = db.query("""
                SELECT TOP (50) id,amount,bank_name,account_name,account_last4,status,transfer_reference,
                    rejection_reason,requested_at,reviewed_at
                FROM dbo.mentor_payout_requests WHERE mentor_id=? ORDER BY requested_at DESC,id DESC
                """, (rs, n) -> new MentorWalletResponse.PayoutRequest(rs.getLong("id"), rs.getBigDecimal("amount"),
                rs.getString("bank_name"), rs.getString("account_name"), rs.getString("account_last4"), rs.getString("status"),
                rs.getString("transfer_reference"), rs.getString("rejection_reason"), rs.getTimestamp("requested_at").toInstant(),
                rs.getTimestamp("reviewed_at") == null ? null : rs.getTimestamp("reviewed_at").toInstant()), mentorId);
        return new MentorWalletResponse(held, available.max(BigDecimal.ZERO), reserved, paid, entries, requests);
    }

    @Transactional
    public MentorWalletResponse.PayoutRequest requestPayout(CreatePayoutRequest input, String remoteAddress) {
        long mentorId = requireRole("MENTOR");
        if (input.amount() == null || input.amount().signum() <= 0 || input.amount().scale() > 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a positive whole-VND amount.");
        String bank = clean(input.bankName(), 100, "Bank name is required.");
        String accountName = clean(input.accountName(), 150, "Account holder name is required.");
        String accountNumber = input.accountNumber() == null ? "" : input.accountNumber().trim();
        if (!accountNumber.matches("[0-9]{6,34}")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid bank account number.");
        String encrypted = encryptAccount(accountNumber);
        return createPayout(db(), mentorId, input.amount(), bank, accountName, encrypted,
                accountNumber.substring(accountNumber.length() - 4), remoteAddress);
    }

    @Transactional(readOnly = true)
    public MentorBankAccountResponse bankAccount() {
        long mentorId = requireRole("MENTOR");
        SavedBankAccount saved = loadSavedBankAccount(db(), mentorId);
        return saved == null ? MentorBankAccountResponse.none()
                : new MentorBankAccountResponse(true, saved.bankName(), saved.accountName(), saved.last4(), saved.updatedAt());
    }

    @Transactional
    public MentorBankAccountResponse saveBankAccount(MentorBankAccountRequest input, String remoteAddress) {
        long mentorId = requireRole("MENTOR");
        String bank = clean(input.bankName(), 100, "Bank name is required.");
        String accountName = clean(input.accountName(), 150, "Account holder name is required.");
        String accountNumber = input.accountNumber() == null ? "" : input.accountNumber().trim();
        if (!accountNumber.matches("[0-9]{6,34}")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid bank account number.");
        JdbcTemplate db = db();
        lockMentor(db, mentorId);
        String encrypted = encryptAccount(accountNumber);
        String last4 = accountNumber.substring(accountNumber.length() - 4);
        int updated = db.update("""
                UPDATE dbo.mentor_bank_accounts
                SET bank_name=?,account_name=?,account_number_ciphertext=?,account_last4=?,updated_at=SYSUTCDATETIME()
                WHERE mentor_id=?
                """, bank, accountName, encrypted, last4, mentorId);
        if (updated == 0) db.update("""
                INSERT INTO dbo.mentor_bank_accounts(mentor_id,bank_name,account_name,account_number_ciphertext,account_last4)
                VALUES (?,?,?,?,?)
                """, mentorId, bank, accountName, encrypted, last4);
        SavedBankAccount saved = loadSavedBankAccount(db, mentorId);
        return new MentorBankAccountResponse(true, saved.bankName(), saved.accountName(), saved.last4(), saved.updatedAt());
    }

    @Transactional
    public PayoutOtpResponse requestPayoutOtp(RequestPayoutOtpRequest input, String remoteAddress) {
        long mentorId = requireRole("MENTOR");
        if (input == null || input.amount() == null || input.amount().signum() <= 0 || input.amount().scale() > 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a positive whole-VND amount.");
        JdbcTemplate db = db();
        SavedBankAccount saved = loadSavedBankAccount(db, mentorId);
        if (saved == null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Save your bank account before requesting a payout.");
        releaseMatured(db, 100);
        BigDecimal available = releasedBalance(db, mentorId).subtract(paidBalance(db, mentorId)).subtract(reservedBalance(db, mentorId, null));
        if (input.amount().compareTo(available) > 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Payout amount exceeds your available balance.");
        MentorContact contact = mentorContact(db, mentorId);
        String code = String.format("%06d", ThreadLocalRandom.current().nextInt(1000000));
        securityTokens.save(SecurityToken.createPayoutOtp(mentorId, code, LocalDateTime.now(clock), PAYOUT_OTP_EXPIRY_MINUTES));
        String destination = saved.bankName() + " ···· " + saved.last4();
        String amountLabel = input.amount().toPlainString() + " VND";
        emailService.sendPayoutOtpEmail(contact.email(), contact.name(), code, amountLabel, destination);
        return new PayoutOtpResponse(maskEmail(contact.email()), destination, PAYOUT_OTP_EXPIRY_MINUTES * 60);
    }

    @Transactional
    public MentorWalletResponse.PayoutRequest submitPayoutWithOtp(SubmitPayoutRequest input, String remoteAddress) {
        long mentorId = requireRole("MENTOR");
        if (input == null || input.amount() == null || input.amount().signum() <= 0 || input.amount().scale() > 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a positive whole-VND amount.");
        JdbcTemplate db = db();
        SavedBankAccount saved = loadSavedBankAccount(db, mentorId);
        if (saved == null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Save your bank account before requesting a payout.");
        verifyPayoutOtp(mentorId, input.otp());
        return createPayout(db, mentorId, input.amount(), saved.bankName(), saved.accountName(),
                saved.ciphertext(), saved.last4(), remoteAddress);
    }

    private MentorWalletResponse.PayoutRequest createPayout(JdbcTemplate db, long mentorId, BigDecimal amount, String bank,
                                                            String accountName, String encrypted, String last4, String remoteAddress) {
        releaseMatured(db, 100);
        lockMentor(db, mentorId);
        BigDecimal available = releasedBalance(db, mentorId).subtract(paidBalance(db, mentorId)).subtract(reservedBalance(db, mentorId, null));
        if (amount.compareTo(available) > 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Payout amount exceeds your available balance.");
        KeyHolderHolder key = insertPayoutRequest(db, mentorId, amount, bank, accountName, encrypted, last4);
        audit(db, mentorId, "MENTOR_PAYOUT_REQUESTED", key.id(), null,
                "{\"status\":\"REQUESTED\",\"amount\":\"" + amount.toPlainString() + "\"}",
                "Mentor requested a wallet payout.", remoteAddress);
        return db.queryForObject("""
                SELECT id,amount,bank_name,account_name,account_last4,status,transfer_reference,
                    rejection_reason,requested_at,reviewed_at FROM dbo.mentor_payout_requests WHERE id=?
                """, (rs, n) -> payoutDto(rs), key.id());
    }

    private void verifyPayoutOtp(long mentorId, String code) {
        String normalized = code == null ? "" : code.trim();
        SecurityToken token = securityTokens
                .findFirstByUserIdAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(mentorId, "PAYOUT")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request a new verification code to continue."));
        LocalDateTime now = LocalDateTime.now(clock);
        if (!token.isValid(now) || !token.matches(normalized))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired verification code.");
        token.markUsed(now);
        securityTokens.saveAndFlush(token);
    }

    private SavedBankAccount loadSavedBankAccount(JdbcTemplate db, long mentorId) {
        return db.query("""
                SELECT bank_name,account_name,account_number_ciphertext,account_last4,updated_at
                FROM dbo.mentor_bank_accounts WHERE mentor_id=?
                """, (rs, n) -> new SavedBankAccount(rs.getString("bank_name"), rs.getString("account_name"),
                rs.getString("account_number_ciphertext"), rs.getString("account_last4"),
                rs.getTimestamp("updated_at").toInstant()), mentorId)
                .stream().findFirst().orElse(null);
    }

    private MentorContact mentorContact(JdbcTemplate db, long mentorId) {
        return db.query("SELECT full_name,email FROM dbo.users WHERE id=?",
                (rs, n) -> new MentorContact(rs.getString("full_name"), rs.getString("email")), mentorId)
                .stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mentor account not found."));
    }

    static String maskEmail(String email) {
        if (email == null || email.isBlank()) return "";
        int at = email.indexOf('@');
        if (at <= 0) return "•••";
        String local = email.substring(0, at);
        String domain = email.substring(at);
        String visible = local.length() <= 2 ? local.substring(0, 1) : local.substring(0, 2);
        return visible + "•••" + domain;
    }

    @Transactional(readOnly = true)
    public List<AdminPayoutRequest> pendingPayouts() {
        requireAnyRole("ADMIN", "STAFF");
        return db().query("""
                SELECT p.id,p.mentor_id,u.full_name,u.email,p.amount,p.bank_name,p.account_name,
                    p.account_number_ciphertext,p.status,p.requested_at
                FROM dbo.mentor_payout_requests p JOIN dbo.users u ON u.id=p.mentor_id
                WHERE p.status='REQUESTED' ORDER BY p.requested_at,p.id
                """, (rs, n) -> new AdminPayoutRequest(rs.getLong("id"), rs.getLong("mentor_id"),
                rs.getString("full_name"), rs.getString("email"), rs.getBigDecimal("amount"),
                rs.getString("bank_name"), rs.getString("account_name"), decryptAccount(rs.getString("account_number_ciphertext")),
                rs.getString("status"), rs.getTimestamp("requested_at").toInstant()));
    }

    @Transactional
    public void decidePayout(long payoutId, PayoutDecisionRequest decision, String remoteAddress) {
        long reviewerId = requireAnyRole("ADMIN", "STAFF");
        if (decision == null || !("PAID".equals(decision.decision()) || "REJECTED".equals(decision.decision())))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose PAID or REJECTED.");
        JdbcTemplate db = db();
        Map<String, Object> payout = db.query("""
                SELECT id,mentor_id,amount,status FROM dbo.mentor_payout_requests WITH (UPDLOCK,HOLDLOCK) WHERE id=?
                """, (rs, n) -> Map.<String,Object>of("id", rs.getLong("id"), "mentorId", rs.getLong("mentor_id"),
                "amount", rs.getBigDecimal("amount"), "status", rs.getString("status")), payoutId)
                .stream().findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payout request not found."));
        if (!"REQUESTED".equals(payout.get("status")))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This payout request has already been reviewed.");
        long mentorId = ((Number) payout.get("mentorId")).longValue();
        lockMentor(db, mentorId);
        Instant now = Instant.now();
        if ("REJECTED".equals(decision.decision())) {
            String reason = clean(decision.rejectionReason(), 500, "Provide a reason for rejecting this payout.");
            db.update("""
                    UPDATE dbo.mentor_payout_requests SET status='REJECTED',rejection_reason=?,reviewed_by=?,reviewed_at=?
                    WHERE id=? AND status='REQUESTED'
                    """, reason, reviewerId, Timestamp.from(now), payoutId);
            audit(db, reviewerId, "MENTOR_PAYOUT_REJECTED", payoutId, "{\"status\":\"REQUESTED\"}",
                    "{\"status\":\"REJECTED\"}", reason, remoteAddress);
            return;
        }
        String transferReference = clean(decision.transferReference(), 150, "Enter the bank transfer reference before marking this payout paid.");
        BigDecimal amount = (BigDecimal) payout.get("amount");
        BigDecimal unreserved = releasedBalance(db, mentorId).subtract(paidBalance(db, mentorId))
                .subtract(reservedBalance(db, mentorId, payoutId));
        if (unreserved.compareTo(amount) < 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Released wallet balance is no longer sufficient for this payout.");
        db.update("""
                UPDATE dbo.mentor_payout_requests SET status='PAID',transfer_reference=?,reviewed_by=?,reviewed_at=?
                WHERE id=? AND status='REQUESTED'
                """, transferReference, reviewerId, Timestamp.from(now), payoutId);
        allocatePayout(db, mentorId, payoutId, amount, reviewerId, now);
        audit(db, reviewerId, "MENTOR_PAYOUT_PAID", payoutId, "{\"status\":\"REQUESTED\"}",
                "{\"status\":\"PAID\",\"amount\":\"" + amount.toPlainString() + "\"}",
                "Bank transfer reference: " + transferReference, remoteAddress);
    }

    @Transactional
    public int releaseMaturedPayments() { return releaseMatured(db(), 250); }

    private int releaseMatured(JdbcTemplate db, int limit) {
        var mature = db.query("""
                SELECT TOP (?) p.id,p.amount,p.commission_rate_snapshot,
                    p.amount-COALESCE(refunded.amount,0) AS distributable_amount
                FROM dbo.payments p WITH (UPDLOCK,READPAST,ROWLOCK)
                JOIN dbo.mentorship_requests r ON r.id=p.request_id
                JOIN dbo.escrow_ledger_entries h ON h.payment_id=p.id AND h.entry_type='HOLD' AND h.reversal_of_id IS NULL
                OUTER APPLY (SELECT SUM(CASE WHEN status='SUCCEEDED' THEN amount ELSE 0 END) AS amount FROM dbo.refunds WHERE payment_id=p.id) refunded
                WHERE p.status='SUCCEEDED' AND p.paid_at<=DATEADD(DAY,-7,SYSUTCDATETIME())
                  AND p.amount>COALESCE(refunded.amount,0)
                  AND NOT EXISTS (SELECT 1 FROM dbo.escrow_ledger_entries e WHERE e.payment_id=p.id AND e.entry_type='MENTOR_RELEASE')
                  AND NOT EXISTS (SELECT 1 FROM dbo.refunds f WHERE f.payment_id=p.id AND f.status IN ('PENDING','PROCESSING'))
                ORDER BY p.paid_at,p.id
                """, (rs,n) -> new MaturePayment(rs.getLong("id"), rs.getBigDecimal("distributable_amount"),
                rs.getBigDecimal("commission_rate_snapshot")), limit);
        int released = 0;
        for (MaturePayment payment : mature) {
            BigDecimal fee = platformFee(payment.distributable(), payment.commissionRate());
            BigDecimal mentorNet = mentorShare(payment.distributable(), fee);
            if (mentorNet.signum() <= 0) continue;
            Timestamp now = Timestamp.from(Instant.now());
            db.update("""
                    INSERT INTO dbo.escrow_ledger_entries(payment_id,entry_type,amount,idempotency_key,created_at)
                    VALUES (?,'MENTOR_RELEASE',?,?,?)
                    """, payment.id(), mentorNet, "ESCROW-RELEASE-" + payment.id(), now);
            if (fee.signum() > 0) db.update("""
                    INSERT INTO dbo.escrow_ledger_entries(payment_id,entry_type,amount,idempotency_key,created_at)
                    VALUES (?,'PLATFORM_FEE',?,?,?)
                    """, payment.id(), fee, "ESCROW-FEE-" + payment.id(), now);
            released++;
        }
        return released;
    }

    private BigDecimal heldBalance(JdbcTemplate db, long mentorId) {
        BigDecimal value = db.queryForObject("""
                SELECT COALESCE(SUM((p.amount-COALESCE(refunded.amount,0))
                    - ROUND((p.amount-COALESCE(refunded.amount,0))*p.commission_rate_snapshot/100.0,0)),0)
                FROM dbo.payments p JOIN dbo.mentorship_requests r ON r.id=p.request_id
                JOIN dbo.escrow_ledger_entries h ON h.payment_id=p.id AND h.entry_type='HOLD' AND h.reversal_of_id IS NULL
                OUTER APPLY (SELECT SUM(CASE WHEN status='SUCCEEDED' THEN amount ELSE 0 END) AS amount FROM dbo.refunds WHERE payment_id=p.id) refunded
                WHERE r.mentor_id=? AND p.status='SUCCEEDED'
                  AND p.amount>COALESCE(refunded.amount,0)
                  AND NOT EXISTS (SELECT 1 FROM dbo.escrow_ledger_entries e WHERE e.payment_id=p.id AND e.entry_type='MENTOR_RELEASE')
                """, BigDecimal.class, mentorId);
        return value == null ? BigDecimal.ZERO : value;
    }

    private BigDecimal releasedBalance(JdbcTemplate db, long mentorId) {
        BigDecimal value = db.queryForObject("""
                SELECT COALESCE(SUM(CASE WHEN e.entry_type='MENTOR_RELEASE' THEN e.amount ELSE 0 END),0)
                FROM dbo.escrow_ledger_entries e JOIN dbo.payments p ON p.id=e.payment_id
                JOIN dbo.mentorship_requests r ON r.id=p.request_id
                WHERE r.mentor_id=? AND e.entry_type='MENTOR_RELEASE'
                """, BigDecimal.class, mentorId);
        return value == null ? BigDecimal.ZERO : value;
    }

    private BigDecimal reservedBalance(JdbcTemplate db, long mentorId, Long exceptId) {
        BigDecimal value = db.queryForObject("""
                SELECT COALESCE(SUM(amount),0) FROM dbo.mentor_payout_requests
                WHERE mentor_id=? AND status='REQUESTED' AND (? IS NULL OR id<>?)
                """, BigDecimal.class, mentorId, exceptId, exceptId);
        return value == null ? BigDecimal.ZERO : value;
    }

    private BigDecimal paidBalance(JdbcTemplate db, long mentorId) {
        BigDecimal value = db.queryForObject("""
                SELECT COALESCE(SUM(e.amount),0) FROM dbo.escrow_ledger_entries e
                JOIN dbo.payments p ON p.id=e.payment_id JOIN dbo.mentorship_requests r ON r.id=p.request_id
                WHERE r.mentor_id=? AND e.entry_type='MENTOR_PAYOUT'
                """, BigDecimal.class, mentorId);
        return value == null ? BigDecimal.ZERO : value;
    }

    private void allocatePayout(JdbcTemplate db, long mentorId, long payoutId, BigDecimal amount, long adminId, Instant now) {
        var allocations = db.query("""
                SELECT e.payment_id,e.amount-COALESCE(paid.amount,0) AS remaining
                FROM dbo.escrow_ledger_entries e
                JOIN dbo.payments p ON p.id=e.payment_id JOIN dbo.mentorship_requests r ON r.id=p.request_id
                OUTER APPLY (SELECT SUM(x.amount) AS amount FROM dbo.escrow_ledger_entries x WHERE x.payment_id=e.payment_id AND x.entry_type='MENTOR_PAYOUT') paid
                WHERE r.mentor_id=? AND e.entry_type='MENTOR_RELEASE' AND e.reversal_of_id IS NULL
                  AND e.amount>COALESCE(paid.amount,0)
                ORDER BY e.created_at,e.id
                """, (rs,n) -> new Allocation(rs.getLong("payment_id"), rs.getBigDecimal("remaining")), mentorId);
        BigDecimal left = amount;
        for (Allocation allocation : allocations) {
            if (left.signum() <= 0) break;
            BigDecimal part = left.min(allocation.remaining());
            db.update("""
                    INSERT INTO dbo.escrow_ledger_entries(payment_id,payout_request_id,entry_type,amount,idempotency_key,created_by,created_at)
                    VALUES (?,?, 'MENTOR_PAYOUT',?,?,?,?)
                    """, allocation.paymentId(), payoutId, part, "ESCROW-PAYOUT-" + payoutId + "-" + allocation.paymentId(), adminId, Timestamp.from(now));
            left = left.subtract(part);
        }
        if (left.signum() > 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "Released wallet balance is no longer sufficient for this payout.");
    }

    private void lockMentor(JdbcTemplate db, long mentorId) {
        Integer exists = db.query("SELECT u.id FROM dbo.users u WITH (UPDLOCK,HOLDLOCK) JOIN dbo.mentor_profiles mp ON mp.user_id=u.id WHERE u.id=? AND u.status='ACTIVE'",
                rs -> rs.next() ? rs.getInt(1) : null, mentorId);
        if (exists == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Active mentor account required.");
    }

    private void audit(JdbcTemplate db, long actorId, String action, long payoutId, String before,
                       String after, String reason, String remoteAddress) {
        String ip = remoteAddress == null ? null : remoteAddress.substring(0, Math.min(remoteAddress.length(), 45));
        db.update("""
                INSERT INTO dbo.audit_logs(actor_id,action,entity_type,entity_id,old_values,new_values,reason,ip_address,retention_class)
                VALUES (?,?, 'MENTOR_PAYOUT_REQUEST', ?, ?, ?, ?, ?, 'FINANCIAL')
                """, actorId, action, Long.toString(payoutId), before, after, reason, ip);
    }

    String encryptAccount(String account) {
        try {
            byte[] key = keyBytes();
            byte[] iv = new byte[12]; RANDOM.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key,"AES"), new GCMParameterSpec(128,iv));
            byte[] encrypted = cipher.doFinal(account.getBytes(StandardCharsets.UTF_8));
            return "v1:" + Base64.getEncoder().encodeToString(ByteBuffer.allocate(iv.length+encrypted.length).put(iv).put(encrypted).array());
        } catch (ResponseStatusException ex) { throw ex; }
        catch (Exception ex) { throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to secure payout details."); }
    }

    String decryptAccount(String value) {
        try {
            if (value == null || !value.startsWith("v1:")) throw new IllegalArgumentException("Unsupported encrypted value");
            byte[] packed = Base64.getDecoder().decode(value.substring(3));
            ByteBuffer buffer = ByteBuffer.wrap(packed); byte[] iv = new byte[12]; buffer.get(iv); byte[] cipherText = new byte[buffer.remaining()]; buffer.get(cipherText);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE,new SecretKeySpec(keyBytes(),"AES"),new GCMParameterSpec(128,iv));
            return new String(cipher.doFinal(cipherText),StandardCharsets.UTF_8);
        } catch (ResponseStatusException ex) { throw ex; }
        catch (Exception ex) { throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Payout account details cannot be decrypted. Check the wallet encryption key."); }
    }

    private byte[] keyBytes() {
        try {
            byte[] key = Base64.getDecoder().decode(encryptionKey);
            if (key.length != 32) throw new IllegalArgumentException();
            return key;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Payouts are unavailable until HPMS_WALLET_ENCRYPTION_KEY is configured with a base64-encoded 32-byte key.");
        }
    }

    private KeyHolderHolder insertPayoutRequest(JdbcTemplate db, long mentorId, BigDecimal amount, String bank,
                                                 String accountName, String encrypted, String last4) {
        Long id = db.queryForObject("""
                INSERT INTO dbo.mentor_payout_requests(mentor_id,amount,bank_name,account_name,account_number_ciphertext,account_last4)
                OUTPUT INSERTED.id VALUES (?,?,?,?,?,?)
                """, Long.class, mentorId, amount, bank, accountName, encrypted, last4);
        return new KeyHolderHolder(id);
    }

    private MentorWalletResponse.PayoutRequest payoutDto(java.sql.ResultSet rs) throws java.sql.SQLException {
        Timestamp reviewed = rs.getTimestamp("reviewed_at");
        return new MentorWalletResponse.PayoutRequest(rs.getLong("id"), rs.getBigDecimal("amount"), rs.getString("bank_name"),
                rs.getString("account_name"), rs.getString("account_last4"), rs.getString("status"), rs.getString("transfer_reference"),
                rs.getString("rejection_reason"), rs.getTimestamp("requested_at").toInstant(), reviewed == null ? null : reviewed.toInstant());
    }

    private long requireRole(String role) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthenticatedUser user) || user.id() == null)
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in to continue.");
        if (user.roles() == null || !user.roles().contains(role))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not authorized to access the wallet operation.");
        return user.id();
    }

    private long requireAnyRole(String... roles) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthenticatedUser user) || user.id() == null)
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in to continue.");
        if (user.roles() == null)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not authorized to access the wallet operation.");
        for (String role : roles) {
            if (user.roles().contains(role)) return user.id();
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not authorized to access the wallet operation.");
    }

    private JdbcTemplate db() {
        if (jdbc == null) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Wallet service is temporarily unavailable.");
        return jdbc;
    }

    private static String clean(String value, int max, String error) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isBlank() || normalized.length() > max) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, error);
        return normalized;
    }

    static BigDecimal platformFee(BigDecimal amount, BigDecimal commissionRate) {
        return amount.multiply(commissionRate).divide(new BigDecimal("100"), 0, RoundingMode.HALF_UP);
    }

    static BigDecimal mentorShare(BigDecimal amount, BigDecimal platformFee) {
        return amount.subtract(platformFee);
    }

    private record MaturePayment(long id, BigDecimal distributable, BigDecimal commissionRate) { }
    private record Allocation(long paymentId, BigDecimal remaining) { }
    private record KeyHolderHolder(long id) { }
    private record SavedBankAccount(String bankName, String accountName, String ciphertext, String last4, Instant updatedAt) { }
    private record MentorContact(String name, String email) { }
}
