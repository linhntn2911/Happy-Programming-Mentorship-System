package com.happyprogramming.dto;

import java.util.List;

public record MenteeTransactionPageDto(
        List<MenteeTransactionDto> transactions,
        long totalElements,
        int totalPages,
        int page,
        int size) {
}
