package com.happyprogramming.dto;

public record DisputeFileDownload(String fileName, String mimeType, long sizeBytes, byte[] content) {}
