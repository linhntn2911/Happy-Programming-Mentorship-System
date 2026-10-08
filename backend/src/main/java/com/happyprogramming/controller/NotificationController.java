package com.happyprogramming.controller;

import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    private Long userId(Authentication auth) {
        if (auth != null && auth.getPrincipal() instanceof AuthenticatedUser u) {
            return u.id();
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in to view notifications.");
    }

    @GetMapping
    public ApiResponse<?> list(Authentication auth) {
        return ApiResponse.ok(service.getUserNotifications(userId(auth)));
    }

    @GetMapping("/history")
    public ApiResponse<?> history(@RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "10") int size,
                                  @RequestParam(defaultValue = "false") boolean unreadOnly,
                                  Authentication auth) {
        return ApiResponse.ok(service.getHistory(userId(auth), page, size, unreadOnly));
    }

    @PostMapping("/{id}/read")
    public ApiResponse<?> markRead(@PathVariable Long id, Authentication auth) {
        boolean success = service.markAsRead(userId(auth), id);
        return ApiResponse.ok(success);
    }

    @PostMapping("/read-all")
    public ApiResponse<?> markAllRead(Authentication auth) {
        int count = service.markAllAsRead(userId(auth));
        return ApiResponse.ok(count);
    }
}
