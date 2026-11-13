package com.happyprogramming.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RefundDecisionRequest(
        @NotBlank @Pattern(regexp = "APPROVED|PAID|REJECTED") String decision,
        @Size(max = 150) String transferReference,
        @Size(max = 500) String rejectionReason,
        @Size(max = 100) String bankName,
        @Size(max = 50) String accountNumber,
        @Size(max = 150) String accountName,
        String receiptFileName,
        String receiptBase64,
        String receiptMimeType) {

    public RefundDecisionRequest(String decision, String transferReference, String rejectionReason,
                                 String bankName, String accountNumber, String accountName) {
        this(decision, transferReference, rejectionReason, bankName, accountNumber, accountName, null, null, null);
    }
}
