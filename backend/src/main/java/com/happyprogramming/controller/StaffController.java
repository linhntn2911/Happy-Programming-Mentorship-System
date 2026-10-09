package com.happyprogramming.controller;

import java.util.List;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.StaffDashboardDto;
import com.happyprogramming.dto.StaffMenteeDto;
import com.happyprogramming.dto.StaffMentorDto;
import com.happyprogramming.service.StaffService;

@RestController
@RequestMapping("/api/staff")
@CrossOrigin(origins = "*")
public class StaffController {
    private final StaffService staffService;

    public StaffController(StaffService staffService) {
        this.staffService = staffService;
    }

    @GetMapping("/dashboard")
    public ApiResponse<StaffDashboardDto> getDashboard() {
        return ApiResponse.ok(staffService.getDashboardOverview());
    }

    @GetMapping("/mentors")
    public ApiResponse<List<StaffMentorDto>> getMentors() {
        return ApiResponse.ok(staffService.getMentors());
    }

    @GetMapping("/mentees")
    public ApiResponse<List<StaffMenteeDto>> getMentees() {
        return ApiResponse.ok(staffService.getMentees());
    }
}
