package com.happyprogramming.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PayoutDecisionRequest(
        @NotBlank @Pattern(regexp = "APPROVED|PAID|REJECTED") String decision,
        @Size(max = 150) String transferReference,
        @Size(max = 1000) String receiptUrl,
        @Size(max = 500) String rejectionReason,
        @Size(max = 255) String receiptFileName,
        String receiptBase64,
        @Size(max = 150) String receiptMimeType) {

    public PayoutDecisionRequest(String decision, String transferReference, String rejectionReason) {
        this(decision, transferReference, null, rejectionReason, null, null, null);
    }

    public PayoutDecisionRequest(String decision, String transferReference, String receiptUrl, String rejectionReason) {
        this(decision, transferReference, receiptUrl, rejectionReason, null, null, null);
    }

    public PayoutDecisionRequest(String decision, String transferReference, String rejectionReason,
                                 String receiptFileName, String receiptBase64, String receiptMimeType) {
        this(decision, transferReference, null, rejectionReason, receiptFileName, receiptBase64, receiptMimeType);
    }
}
