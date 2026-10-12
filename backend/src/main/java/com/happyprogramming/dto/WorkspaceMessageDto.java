package com.happyprogramming.dto;

import java.time.Instant;

public record WorkspaceMessageDto(
        Long id,
        Long senderId,
        String senderName,
        String messageType,
        String body,
        String codeLanguage,
        Instant sentAt,
        boolean mine,
        Long fileId,
        String fileName,
        String fileMimeType,
        Long fileSizeBytes
) {}
