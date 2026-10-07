package vn.happyprogramming.staff;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.happyprogramming.common.ApiResponse;

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

    @GetMapping("/mentor-applications")
    public ApiResponse<List<StaffApplicationDto>> getApplications() {
        return ApiResponse.ok(staffService.getApplications());
    }

    @PostMapping("/mentor-applications/{id}/approve")
    public ApiResponse<StaffApplicationDto> approveApplication(@PathVariable("id") String id) {
        StaffApplicationDto result = staffService.approveApplication(id);
        if (result == null) {
            return ApiResponse.error("Application not found");
        }
        return ApiResponse.ok("Mentor application approved successfully", result);
    }

    @PostMapping("/mentor-applications/{id}/reject")
    public ApiResponse<StaffApplicationDto> rejectApplication(@PathVariable("id") String id, @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        StaffApplicationDto result = staffService.rejectApplication(id, reason);
        if (result == null) {
            return ApiResponse.error("Application not found");
        }
        return ApiResponse.ok("Mentor application rejected", result);
    }
}
