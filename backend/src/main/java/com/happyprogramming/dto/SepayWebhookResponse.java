package com.happyprogramming.dto;

public record SepayWebhookResponse(
        boolean success,
        String message
) {}
