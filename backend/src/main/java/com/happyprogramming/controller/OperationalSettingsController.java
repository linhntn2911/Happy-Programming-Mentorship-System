package com.happyprogramming.controller;

import com.happyprogramming.dto.*;
import com.happyprogramming.service.*;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
public class OperationalSettingsController {
    private final OperationalSettingsService operations;
    private final AdminService admins;
    public OperationalSettingsController(OperationalSettingsService operations,AdminService admins){this.operations=operations;this.admins=admins;}
    private AdminDtos.Session admin(Authentication auth){
        if(auth==null||!(auth.getPrincipal() instanceof AuthenticatedUser user))throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return admins.requireAdmin(user.email());
    }
    @GetMapping("/api/public/operations") public ApiResponse<OperationalSettings> publicStatus(){return ApiResponse.ok(operations.read());}
    @GetMapping("/api/admin/operations") public ApiResponse<OperationalSettings> settings(Authentication auth){admin(auth);return ApiResponse.ok(operations.read());}
    @PutMapping("/api/admin/operations") public ApiResponse<Boolean> update(@Valid @RequestBody OperationalSettings.Change change,Authentication auth,HttpServletRequest request){operations.update(change,admin(auth),request.getRemoteAddr());return ApiResponse.ok(true);}
}
