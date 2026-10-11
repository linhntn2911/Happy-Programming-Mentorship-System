package com.happyprogramming.service;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.Base64;
import java.security.SecureRandom;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class MentorWalletServiceTest {
    @Test
    void splitsGrossPaymentUsingSavedCommissionAndWholeVndRounding() {
        BigDecimal gross = new BigDecimal("1200000");
        BigDecimal fee = MentorWalletService.platformFee(gross, new BigDecimal("15.00"));

        assertEquals(new BigDecimal("180000"), fee);
        assertEquals(new BigDecimal("1020000"), MentorWalletService.mentorShare(gross, fee));
    }

    @Test
    void roundsFractionalCommissionOnceAndPreservesGrossTotal() {
        BigDecimal gross = new BigDecimal("5001");
        BigDecimal fee = MentorWalletService.platformFee(gross, new BigDecimal("15.00"));
        BigDecimal mentorShare = MentorWalletService.mentorShare(gross, fee);

        assertEquals(new BigDecimal("750"), fee);
        assertEquals(new BigDecimal("4251"), mentorShare);
        assertEquals(gross, fee.add(mentorShare));
    }

    @Test
    void payoutAccountEncryptionUsesAuthenticatedCiphertextAndRandomNonce() {
        byte[] key = new byte[32]; new SecureRandom().nextBytes(key);
        MentorWalletService service = new MentorWalletService(null, Base64.getEncoder().encodeToString(key));

        String first = service.encryptAccount("1234567890");
        String second = service.encryptAccount("1234567890");

        assertNotEquals("1234567890", first);
        assertNotEquals(first, second);
        assertEquals("1234567890", service.decryptAccount(first));
    }

    @Test
    void payoutDetailsFailClosedWithoutConfiguredEncryptionKey() {
        MentorWalletService service = new MentorWalletService(null, "");

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.encryptAccount("1234567890"));

        assertEquals(503, error.getStatusCode().value());
    }
}
