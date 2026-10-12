package com.happyprogramming.dto;

public record WorkspaceFileDownload(
        String fileName,
        String mimeType,
        long sizeBytes,
        byte[] content
) {}

