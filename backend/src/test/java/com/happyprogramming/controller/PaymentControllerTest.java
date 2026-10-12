package com.happyprogramming.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.happyprogramming.dto.SepayWebhookPayload;
import com.happyprogramming.dto.SepayWebhookResponse;
import com.happyprogramming.service.SepayPaymentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PaymentController.class)
@AutoConfigureMockMvc(addFilters = false)
class PaymentControllerTest {
    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean SepayPaymentService sepayPaymentService;

    @Test
    void sepayWebhookInvokesServiceAndReturnsResponse() throws Exception {
        SepayWebhookPayload payload = new SepayWebhookPayload(
                1L, "TPBank", "2026-10-12 06:30:00", "00000806194", "HP99A1",
                "HP99A1 chuyen tien", "in", new BigDecimal("2500000"),
                new BigDecimal("5000000"), null, "FT123", "");

        when(sepayPaymentService.processWebhook(any(SepayWebhookPayload.class), eq("Apikey hpms_sepay_secret_2026")))
                .thenReturn(new SepayWebhookResponse(true, "Payment confirmed and mentorship activated."));

        mockMvc.perform(post("/api/payments/sepay/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Apikey hpms_sepay_secret_2026")
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Payment confirmed and mentorship activated."));
    }
}
