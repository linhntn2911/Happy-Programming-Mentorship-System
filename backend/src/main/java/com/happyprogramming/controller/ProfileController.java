package com.happyprogramming.controller;
import com.happyprogramming.dto.*;
import com.happyprogramming.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.server.ResponseStatusException;
@RestController
@RequestMapping("/api/profile/me")
public class ProfileController {
    private final ProfileService service;
    public ProfileController(ProfileService service) { this.service=service; }
    private Long id(Authentication auth) { return auth!=null && auth.getPrincipal() instanceof AuthenticatedUser user ? user.id() : null; }
    @GetMapping public ApiResponse<?> get(Authentication auth) { return ApiResponse.ok(service.get(id(auth))); }
    @PutMapping public ApiResponse<?> update(Authentication auth,@Valid @RequestBody ProfileDtos.Update body) { return ApiResponse.ok(service.update(id(auth),body)); }
    @GetMapping("/avatar") public ResponseEntity<byte[]> avatar(Authentication auth) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff").contentType(MediaType.IMAGE_PNG).body(service.avatar(id(auth)));
    }
    @PutMapping("/avatar") public ApiResponse<?> upload(Authentication auth,@Valid @RequestBody ProfileDtos.Avatar body) { return ApiResponse.ok(service.upload(id(auth),body.base64())); }
    @DeleteMapping("/avatar") public ApiResponse<?> remove(Authentication auth) { return ApiResponse.ok(service.removeAvatar(id(auth))); }
    @ExceptionHandler(ResponseStatusException.class) public ResponseEntity<?> failure(ResponseStatusException ex) { return ResponseEntity.status(ex.getStatusCode()).body(ApiResponse.error(ex.getReason())); }
    @ExceptionHandler(MethodArgumentNotValidException.class) public ResponseEntity<?> invalid(MethodArgumentNotValidException ex) { return ResponseEntity.badRequest().body(ApiResponse.error("Check the profile fields and their length limits.")); }
}
