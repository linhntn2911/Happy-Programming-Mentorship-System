package com.happyprogramming.controller;

import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.PublicSupportConfig;
import com.happyprogramming.service.PublicConfigService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PublicConfigController {
    private final PublicConfigService service;

    public PublicConfigController(PublicConfigService service) {
        this.service = service;
    }

    @GetMapping("/api/public/support")
    public ApiResponse<PublicSupportConfig> support() {
        return ApiResponse.ok(service.support());
    }
}
