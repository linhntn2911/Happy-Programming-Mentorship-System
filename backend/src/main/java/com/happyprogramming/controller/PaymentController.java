package com.happyprogramming.controller;

import com.happyprogramming.dto.VnPayIpnResponse;
import com.happyprogramming.service.VnPayPaymentService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
public class PaymentController {
    private final VnPayPaymentService paymentService;
    private final String frontendCheckoutUrl;

    public PaymentController(VnPayPaymentService paymentService,
                             @Value("${hpms.vnpay.frontend-checkout-url:http://localhost:5173/#/checkout}") String frontendCheckoutUrl) {
        this.paymentService = paymentService;
        this.frontendCheckoutUrl = frontendCheckoutUrl;
    }

    @GetMapping("/api/payments/vnpay/ipn")
    public VnPayIpnResponse ipn(@RequestParam Map<String, String> parameters) {
        return paymentService.processIpn(parameters);
    }

    @GetMapping("/api/payments/vnpay/return")
    public ResponseEntity<Void> paymentReturn(@RequestParam Map<String, String> parameters) {
        Long requestId = paymentService.resolveReturnRequestId(parameters);
        String target = frontendCheckoutUrl;
        if (requestId != null) {
            target += (target.contains("?") ? "&" : "?") + "requestId=" + requestId + "&paymentReturn=1";
        } else {
            target = target.replace("#/checkout", "#/applications");
        }
        return ResponseEntity.status(302).header(HttpHeaders.LOCATION, target).build();
    }
}
