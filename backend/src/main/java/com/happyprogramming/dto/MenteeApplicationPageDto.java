package com.happyprogramming.dto;

import java.util.List;

public record MenteeApplicationPageDto(
        List<MenteeApplicationDto> applications,
        long totalElements,
        int totalPages,
        int page,
        int size) {
}
