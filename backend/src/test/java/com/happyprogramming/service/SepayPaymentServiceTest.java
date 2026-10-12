package com.happyprogramming.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.happyprogramming.dto.SepayWebhookPayload;
import com.happyprogramming.dto.SepayWebhookResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SepayPaymentServiceTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private SepayPaymentService service;

    @Test
    void rejectsMissingConfigurationAndMissingIdentityBeforeDatabaseAccess() {
        var disabled = new SepayPaymentService(null, mapper, true, "Test", "123", "Test", "", "compact");
        assertEquals(503, assertThrows(ResponseStatusException.class, () -> disabled.processWebhook(null, null)).getStatusCode().value());
        var incomplete = new SepayWebhookPayload(null, "Test", null, null, "HP42A1", "HP42A1", null, BigDecimal.ONE, null, null, null, null);
        assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.processWebhook(incomplete, "Apikey hpms_sepay_secret_2026")).getStatusCode().value());
        assertEquals(401, assertThrows(ResponseStatusException.class, () -> service.processWebhook(incomplete, "Bearer hpms_sepay_secret_2026")).getStatusCode().value());
    }
    @BeforeEach
    void setUp() {
        service = new SepayPaymentService(
                null,
                mapper,
                true,
                "TPBank",
                "00000806194",
                "NGUYEN THI NGOC LINH",
                "hpms_sepay_secret_2026",
                "compact"
        );
    }

    @Test
    void buildsSePayQrUrlWithCorrectParameters() {
        String qrUrl = service.buildQrUrl(new BigDecimal("1500000"), "HP42A1");

        assertTrue(qrUrl.startsWith("https://qr.sepay.vn/img?"));
        assertTrue(qrUrl.contains("bank=TPBank"));
        assertTrue(qrUrl.contains("acc=00000806194"));
        assertTrue(qrUrl.contains("amount=1500000"));
        assertTrue(qrUrl.contains("des=HP42A1"));
    }

    @Test
    void rejectsWebhookWithInvalidApiKey() {
        SepayWebhookPayload payload = new SepayWebhookPayload(
                1L, "TPBank", "2026-10-12 06:30:00", "00000806194", "HP42A1",
                "HP42A1", "in", new BigDecimal("1500000"),
                new BigDecimal("5000000"), null, "FT123", "");

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () ->
                service.processWebhook(payload, "Apikey wrong_secret"));

        assertEquals(401, exception.getStatusCode().value());
    }

    @Test
    void ignoresNonInboundTransferGracefully() {
        SepayWebhookPayload payload = new SepayWebhookPayload(
                1L, "TPBank", "2026-10-12 06:30:00", "00000806194", "HP42A1",
                "HP42A1", "out", new BigDecimal("1500000"),
                new BigDecimal("5000000"), null, "FT123", "");

        SepayWebhookResponse response = service.processWebhook(payload, "Apikey hpms_sepay_secret_2026");

        assertTrue(response.success());
        assertTrue(response.message().contains("Ignored non-inbound"));
    }

    @Test
    void ignoresAccountNumberMismatchGracefully() {
        SepayWebhookPayload payload = new SepayWebhookPayload(
                1L, "TPBank", "2026-10-12 06:30:00", "9999999999", "HP42A1",
                "HP42A1", "in", new BigDecimal("1500000"),
                new BigDecimal("5000000"), null, "FT123", "");

        SepayWebhookResponse response = service.processWebhook(payload, "Apikey hpms_sepay_secret_2026");

        assertTrue(response.success());
        assertTrue(response.message().contains("account number mismatch"));
    }

    @Test
    void ignoresPayloadWhenNoOrderCodeInContent() {
        SepayWebhookPayload payload = new SepayWebhookPayload(
                1L, "TPBank", "2026-10-12 06:30:00", "00000806194", null,
                "Chuyen tien ca nhan khong co ma don", "in", new BigDecimal("1500000"),
                new BigDecimal("5000000"), null, "FT123", "");

        SepayWebhookResponse response = service.processWebhook(payload, "Apikey hpms_sepay_secret_2026");

        assertTrue(response.success());
        assertTrue(response.message().contains("no order reference found"));
    }

    @Test
    void acceptsOnlyTheExactRequiredAmount() {
        BigDecimal requiredAmount = new BigDecimal("1200000");

        assertTrue(SepayPaymentService.matchesExpectedAmount(
                new BigDecimal("1200000.00"), requiredAmount));
        assertFalse(SepayPaymentService.matchesExpectedAmount(
                new BigDecimal("1199999"), requiredAmount));
        assertFalse(SepayPaymentService.matchesExpectedAmount(
                new BigDecimal("1200001"), requiredAmount));
        assertFalse(SepayPaymentService.matchesExpectedAmount(null, requiredAmount));
    }
}
