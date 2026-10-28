package com.happyprogramming.dto;

import java.time.Instant;

public record MentorBankAccountResponse(
        boolean saved,
        String bankName,
        String accountName,
        String accountLast4,
        Instant updatedAt) {
    public static MentorBankAccountResponse none() {
        return new MentorBankAccountResponse(false, null, null, null, null);
    }
}
