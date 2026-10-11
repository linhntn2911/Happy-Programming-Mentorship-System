package com.happyprogramming.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class VnPayPaymentServiceTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void rebuildsMissingLegacySnapshotFromUnchangedLinkedOffering() throws Exception {
        String snapshot = VnPayPaymentService.recoverLegacyOfferSnapshot(mapper, legacyRequest());
        var json = mapper.readTree(snapshot);

        assertEquals(41L, json.path("serviceId").asLong());
        assertEquals("Standard Mentorship", json.path("name").asText());
        assertEquals("1000000.00", json.path("price").asText());
        assertEquals("VND", json.path("currency").asText());
        assertEquals(1, json.path("callsPerPeriod").asInt());
        assertEquals(11, json.path("sessionDurationMinutes").asInt());
    }

    @Test
    void doesNotRebuildSnapshotWhenOfferingChangedAfterApplication() {
        Map<String, Object> request = legacyRequest();
        request.put("linkedServiceUpdatedAt", Timestamp.from(Instant.parse("2026-10-10T12:00:00Z")));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> VnPayPaymentService.recoverLegacyOfferSnapshot(mapper, request));

        assertEquals(409, error.getStatusCode().value());
        assertTrue(error.getReason().contains("cannot be verified"));
    }

    private static Map<String, Object> legacyRequest() {
        Instant submitted = Instant.parse("2026-10-09T12:00:00Z");
        Map<String, Object> request = new HashMap<>();
        request.put("submittedAt", Timestamp.from(submitted));
        request.put("linkedServiceUpdatedAt", Timestamp.from(submitted.minusSeconds(60)));
        request.put("linkedServiceStatus", "ACTIVE");
        request.put("linkedServiceId", 41L);
        request.put("linkedServiceName", "Standard Mentorship");
        request.put("linkedServicePrice", new BigDecimal("1000000.00"));
        request.put("linkedServiceCurrency", "VND");
        request.put("linkedSessionDurationMinutes", 11);
        request.put("linkedCallsPerPeriod", 1);
        request.put("linkedTrialDays", 0);
        return request;
    }
}
