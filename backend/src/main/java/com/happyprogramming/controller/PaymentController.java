package com.happyprogramming.controller;

import com.happyprogramming.dto.SepayWebhookPayload;
import com.happyprogramming.dto.SepayWebhookResponse;
import com.happyprogramming.service.SepayPaymentService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PaymentController {
    private final SepayPaymentService sepayPaymentService;

    public PaymentController(SepayPaymentService sepayPaymentService) {
        this.sepayPaymentService = sepayPaymentService;
    }

    @PostMapping("/api/payments/sepay/webhook")
    public SepayWebhookResponse sepayWebhook(
            @RequestBody(required = false) SepayWebhookPayload payload,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return sepayPaymentService.processWebhook(payload, authHeader);
    }
}
