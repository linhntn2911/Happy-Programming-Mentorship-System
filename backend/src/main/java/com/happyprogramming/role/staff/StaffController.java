package com.happyprogramming.role.staff;

import java.util.List;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.happyprogramming.role.shared.ApiResponse;
import com.happyprogramming.role.staff.StaffDashboardDto;
import com.happyprogramming.role.staff.StaffMenteeDto;
import com.happyprogramming.role.staff.StaffMentorDto;
import com.happyprogramming.role.staff.StaffService;

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
