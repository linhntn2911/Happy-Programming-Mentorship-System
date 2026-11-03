package com.happyprogramming.dto;

import java.time.Instant;
import java.util.List;

public record MentorDisputeDetail(
        long id,
        String status,
        String reasonCode,
        String description,
        String targetType,
        Long targetId,
        String targetLabel,
        String complainantName,
        String resolution,
        String resolutionNote,
        Instant resolvedAt,
        Instant createdAt,
        boolean responded,
        List<Evidence> evidence,
        List<Response> responses) {

    public record Response(long id, String authorSide, String authorName, String message,
                           Instant createdAt, List<Evidence> evidence) { }

    public record Evidence(long id, long fileId, String fileName, String mimeType, long sizeBytes,
                           String uploadedSide, Instant createdAt) { }
}
