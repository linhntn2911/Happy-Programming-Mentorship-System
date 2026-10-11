package com.happyprogramming.controller;

import com.happyprogramming.dto.VnPayIpnResponse;
import com.happyprogramming.service.VnPayPaymentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PaymentController.class)
@AutoConfigureMockMvc(addFilters = false)
class PaymentControllerTest {
    @Autowired MockMvc mockMvc;
    @MockitoBean VnPayPaymentService paymentService;

    @Test
    void ipnReturnsProviderResponseShape() throws Exception {
        when(paymentService.processIpn(anyMap())).thenReturn(new VnPayIpnResponse("97", "Invalid signature"));

        mockMvc.perform(get("/api/payments/vnpay/ipn").param("vnp_TxnRef", "HP-99"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.RspCode").value("97"))
                .andExpect(jsonPath("$.Message").value("Invalid signature"));
    }

    @Test
    void browserReturnOnlyRedirectsToCheckoutAndDoesNotSettle() throws Exception {
        when(paymentService.resolveReturnRequestId(anyMap())).thenReturn(99L);

        mockMvc.perform(get("/api/payments/vnpay/return").param("vnp_TxnRef", "HP-99"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "http://localhost:5173/#/checkout?requestId=99&paymentReturn=1"));
    }
}
