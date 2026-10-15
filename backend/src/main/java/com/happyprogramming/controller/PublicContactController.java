package com.happyprogramming.controller;

import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.PublicContactResponse;
import com.happyprogramming.service.PublicContactService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PublicContactController {
    private final PublicContactService service;

    public PublicContactController(PublicContactService service) { this.service = service; }

    @GetMapping("/api/public/contact")
    public ResponseEntity<ApiResponse<PublicContactResponse>> contact() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.ok(service.contact()));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiResponse<Void>> unavailable(Exception exception) {
        return ResponseEntity.status(503).cacheControl(CacheControl.noStore())
            .body(ApiResponse.error("Support contact is temporarily unavailable. Please try again."));
    }
}
