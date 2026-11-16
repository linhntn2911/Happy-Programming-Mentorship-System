package com.happyprogramming.controller;

import com.happyprogramming.dto.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.converter.HttpMessageNotReadableException;

@RestControllerAdvice(assignableTypes=AdminController.class)
public class AdminExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(AdminExceptionHandler.class);

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> status(ResponseStatusException e) { return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason())); }
    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    ResponseEntity<?> invalid(Exception e) { return ResponseEntity.badRequest().body(ApiResponse.error("Check the submitted values and provide a reason for this change.")); }
    @ExceptionHandler(Exception.class)
    ResponseEntity<?> unavailable(Exception e) {
        log.error("Unhandled admin operation error", e);
        String msg = e.getMessage() != null && !e.getMessage().isBlank() ? e.getMessage() : "Administration data is unavailable. Please try again or contact your system operator.";
        return ResponseEntity.internalServerError().body(ApiResponse.error(msg));
    }
}
