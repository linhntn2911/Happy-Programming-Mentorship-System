package com.happyprogramming.role.admin;

import com.happyprogramming.role.admin.AdminDtos;
import com.happyprogramming.role.admin.AdminRepository;
import com.happyprogramming.role.admin.AdminService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import com.happyprogramming.role.shared.ApiResponse;

@RestControllerAdvice(assignableTypes=AdminController.class)
public class AdminExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> status(ResponseStatusException e) { return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason())); }
    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    ResponseEntity<?> invalid(Exception e) { return ResponseEntity.badRequest().body(ApiResponse.error("Check the submitted values and provide a reason for this change.")); }
    @ExceptionHandler(Exception.class)
    ResponseEntity<?> unavailable(Exception e) { return ResponseEntity.internalServerError().body(ApiResponse.error("Administration data is unavailable. Please try again or contact your system operator.")); }
}
