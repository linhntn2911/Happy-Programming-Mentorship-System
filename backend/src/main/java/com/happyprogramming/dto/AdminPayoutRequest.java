package com.happyprogramming.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record AdminPayoutRequest(long id, long mentorId, String mentorName, String mentorEmail,
                                 BigDecimal amount, String bankName, String accountName,
                                 String accountNumber, String status, Instant requestedAt) { }
