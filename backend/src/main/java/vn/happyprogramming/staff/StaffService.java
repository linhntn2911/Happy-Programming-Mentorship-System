package vn.happyprogramming.staff;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class StaffService {

    private final ConcurrentHashMap<String, StaffApplicationDto> applicationsMap = new ConcurrentHashMap<>();

    public StaffService() {
        initInitialData();
    }

    private void initInitialData() {
        List<StaffApplicationDto> initial = List.of(
            new StaffApplicationDto("MA-018", "Nguyen Van A", "an.nguyen@example.com", "0987654321", "Backend Engineering", 6, "20/09/2026", "PENDING", "Experienced Java Spring Boot & Microservices engineer passionate about mentoring junior developers.", List.of("Java", "Spring Boot", "SQL Server", "REST API"), "Mentor_CV_NguyenVanA.pdf", "3.4 MB", "https://linkedin.com/in/nguyenvana", "https://github.com/nguyenvana", "https://nguyenvana.dev", null),
            new StaffApplicationDto("MA-019", "Tran Thi B", "b.tran@example.com", "0912345678", "Frontend Development", 5, "19/09/2026", "PENDING", "Senior React & TypeScript engineer with 5 years experience building modern web apps.", List.of("React", "TypeScript", "Tailwind CSS", "Next.js"), "TranThiB_Frontend_CV.pdf", "2.1 MB", "https://linkedin.com/in/tranthib", "https://github.com/tranthib", "https://tranthib.dev", null),
            new StaffApplicationDto("MA-020", "Le Van C", "c.levan@example.com", "0933445566", "AI & Machine Learning", 4, "18/09/2026", "PENDING", "AI Researcher specializing in PyTorch, computer vision, and LLM applications.", List.of("Python", "PyTorch", "Machine Learning", "FastAPI"), "LeVanC_AI_Resume.pdf", "4.8 MB", "https://linkedin.com/in/levanc", "https://github.com/levanc", null, null),
            new StaffApplicationDto("MA-017", "Hoang Duc Anh", "anh.hoang@example.com", "0977889900", "Full-stack Development", 5, "15/09/2026", "APPROVED", "Full-stack engineer with expertise in Node.js, Express, React, and MongoDB.", List.of("Node.js", "Express", "React", "MongoDB"), "HoangDucAnh_FullStack_CV.pdf", "1.9 MB", "https://linkedin.com/in/hoangducanh", "https://github.com/hoangducanh", null, "Verified and approved by Staff"),
            new StaffApplicationDto("MA-016", "Ngo Bao Ngoc", "ngoc.ngo@example.com", "0944556677", "Data Analysis & SQL", 7, "12/09/2026", "REJECTED", "Data Analyst specializing in SQL Server, PowerBI, and business intelligence.", List.of("SQL", "PowerBI", "Data Analysis"), "NgoBaoNgoc_Data_CV.pdf", "5.2 MB", "https://linkedin.com/in/ngobaongoc", null, null, "Uploaded CV indicates less than required 3 years practical software engineering experience.")
        );

        for (StaffApplicationDto app : initial) {
            applicationsMap.put(app.getId(), app);
        }
    }

    public StaffDashboardDto getDashboardOverview() {
        long pendingApps = applicationsMap.values().stream().filter(a -> "PENDING".equalsIgnoreCase(a.getStatus())).count();

        List<StaffActivityDto> activities = List.of(
            new StaffActivityDto("MA-018", "APPLICATION", "Mentor Application #MA-018", "Nguyen Van A submitted PDF CV for Java & Spring Boot track", "PENDING", "10 mins ago"),
            new StaffActivityDto("RQ-0301", "REQUEST", "Mentorship Request #RQ-0301", "Pham Minh Khoa applied for Monthly Mentorship with Minh An Nguyen", "ACCEPTED", "25 mins ago"),
            new StaffActivityDto("SK-012", "SKILL", "Skill Catalog Updated", "Spring Boot 3 set to ACTIVE by Staff", "ACTIVE", "1 hour ago"),
            new StaffActivityDto("SR-104", "SUPPORT", "Support Ticket #SR-104", "Escrow refund inquiry processed under 7-day trial policy", "RESOLVED", "2 hours ago"),
            new StaffActivityDto("MA-017", "APPLICATION", "Mentor Application #MA-017", "Hoang Duc Anh approved for Full-stack track", "APPROVED", "4 hours ago")
        );

        return new StaffDashboardDto(pendingApps, 186, 1024, 37, activities);
    }

    public List<StaffMentorDto> getMentors() {
        return List.of(
            new StaffMentorDto("M-001", "Nguyen Van An", "an.nguyen@example.com", "Senior Backend Engineer", List.of("Java", "Spring Boot", "SQL Server"), 8, "ACTIVE", "Passionate about clean architecture and mentoring junior software engineers.", "2,500,000", "500,000", "Mentor_CV_NguyenVanA.pdf"),
            new StaffMentorDto("M-002", "Tran Thi Mai", "mai.tran@example.com", "Lead Frontend Engineer", List.of("React", "JavaScript", "Tailwind CSS"), 4, "ACTIVE", "Specialized in modern web architecture, UI design systems, and state management.", "1,800,000", "400,000", "TranThiMai_CV.pdf"),
            new StaffMentorDto("M-003", "Le Minh Quan", "quan.le@example.com", "Senior Python & AI Engineer", List.of("Python", "Django", "PyTorch"), 6, "ACTIVE", "Helping mentees master Python backend systems and machine learning fundamentals.", "2,800,000", "600,000", "LeMinhQuan_CV.pdf"),
            new StaffMentorDto("M-004", "Pham Thu Ha", "ha.pham@example.com", "C# .NET Architect", List.of("C#", ".NET Core", "SQL Server"), 3, "ACTIVE", "Building scalable enterprise services with .NET and SQL Server.", "2,200,000", "450,000", "PhamThuHa_CV.pdf"),
            new StaffMentorDto("M-005", "Hoang Duc Anh", "anh.hoang@example.com", "Full-stack Developer", List.of("Node.js", "MongoDB", "React"), 5, "ACTIVE", "Hands-on guidance for full-stack JavaScript applications and REST APIs.", "2,400,000", "500,000", "HoangDucAnh_FullStack_CV.pdf"),
            new StaffMentorDto("M-006", "Vu Thanh Tung", "tung.vu@example.com", "Mobile Engineer", List.of("Flutter", "Dart", "Firebase"), 4, "ACTIVE", "Cross-platform mobile application development with Flutter.", "2,000,000", "400,000", "VuThanhTung_CV.pdf"),
            new StaffMentorDto("M-007", "Dang Bao Ngoc", "ngoc.dang@example.com", "Data Engineer", List.of("SQL", "Data Analysis", "Python"), 7, "ACTIVE", "Data pipeline design, ETL processes, and database query optimization.", "2,600,000", "550,000", "DangBaoNgoc_CV.pdf"),
            new StaffMentorDto("M-008", "Bui Quoc Huy", "huy.bui@example.com", "DevOps & Cloud Specialist", List.of("DevOps", "Docker", "AWS"), 6, "ACTIVE", "Containerizing applications and setting up automated CI/CD pipelines.", "2,700,000", "550,000", "BuiQuocHuy_CV.pdf")
        );
    }

    public List<StaffMenteeDto> getMentees() {
        return List.of(
            new StaffMenteeDto("U-101", "Pham Minh Khoa", "khoa.pham@example.com", "18/09/2026", 3, "ACTIVE", true),
            new StaffMenteeDto("U-102", "Nguyen Thi Lan", "lan.nguyen@example.com", "15/09/2026", 1, "ACTIVE", true),
            new StaffMenteeDto("U-103", "Tran Van Hieu", "hieu.tran@example.com", "12/09/2026", 5, "ACTIVE", true),
            new StaffMenteeDto("U-104", "Le Thu Trang", "trang.le@example.com", "09/09/2026", 0, "INACTIVE", true),
            new StaffMenteeDto("U-105", "Do Quang Vinh", "vinh.do@example.com", "05/09/2026", 2, "ACTIVE", true),
            new StaffMenteeDto("U-106", "Ngo Bich Phuong", "phuong.ngo@example.com", "01/09/2026", 4, "ACTIVE", true),
            new StaffMenteeDto("U-107", "Vo Hoang Nam", "nam.vo@example.com", "28/08/2026", 1, "LOCKED", false),
            new StaffMenteeDto("U-108", "Dinh Khanh Linh", "linh.dinh@example.com", "24/08/2026", 6, "ACTIVE", true)
        );
    }

    public List<StaffApplicationDto> getApplications() {
        return new ArrayList<>(applicationsMap.values());
    }

    public StaffApplicationDto approveApplication(String applicationId) {
        StaffApplicationDto app = applicationsMap.get(applicationId);
        if (app != null) {
            app.setStatus("APPROVED");
            app.setReviewNote("Verified credentials and PDF CV. Approved by Staff.");
        }
        return app;
    }

    public StaffApplicationDto rejectApplication(String applicationId, String reason) {
        StaffApplicationDto app = applicationsMap.get(applicationId);
        if (app != null) {
            app.setStatus("REJECTED");
            app.setReviewNote(reason != null && !reason.isBlank() ? reason : "Application rejected by Staff.");
        }
        return app;
    }
}
