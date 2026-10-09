package com.happyprogramming.controller;

import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.service.WishlistService;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wishlists")
public class WishlistController {
    private final WishlistService service;
    public WishlistController(WishlistService service) { this.service = service; }
    @GetMapping public ApiResponse<?> list(Authentication auth) { return ApiResponse.ok(service.list(userId(auth))); }
    @PutMapping("/{mentorSlug}") public ApiResponse<?> save(@PathVariable String mentorSlug, Authentication auth) { return ApiResponse.ok(service.save(userId(auth), mentorSlug)); }
    @DeleteMapping("/{mentorSlug}") public ApiResponse<?> remove(@PathVariable String mentorSlug, Authentication auth) { return ApiResponse.ok(service.remove(userId(auth), mentorSlug)); }
    private Long userId(Authentication auth) { return auth != null && auth.getPrincipal() instanceof AuthenticatedUser user ? user.id() : null; }
}
