import { apiClient } from './apiClient.js';

const MOCK_MENTORS = [
  { id: 'M-001', name: 'Nguyen Van An', email: 'an.nguyen@example.com', jobTitle: 'Senior Backend Engineer', skills: ['Java', 'Spring Boot', 'SQL Server'], experienceYears: 8, status: 'ACTIVE', bio: 'Passionate about clean architecture and mentoring junior software engineers.', monthlyPrice: '2,500,000', sessionPrice: '500,000', cvUrl: 'Mentor_CV_NguyenVanA.pdf' },
  { id: 'M-002', name: 'Tran Thi Mai', email: 'mai.tran@example.com', jobTitle: 'Lead Frontend Engineer', skills: ['React', 'JavaScript', 'Tailwind CSS'], experienceYears: 4, status: 'ACTIVE', bio: 'Specialized in modern web architecture, UI design systems, and state management.', monthlyPrice: '1,800,000', sessionPrice: '400,000', cvUrl: 'TranThiMai_CV.pdf' },
  { id: 'M-003', name: 'Le Minh Quan', email: 'quan.le@example.com', jobTitle: 'Senior Python & AI Engineer', skills: ['Python', 'Django', 'PyTorch'], experienceYears: 6, status: 'ACTIVE', bio: 'Helping mentees master Python backend systems and machine learning fundamentals.', monthlyPrice: '2,800,000', sessionPrice: '600,000', cvUrl: 'LeMinhQuan_CV.pdf' },
  { id: 'M-004', name: 'Pham Thu Ha', email: 'ha.pham@example.com', jobTitle: 'C# .NET Architect', skills: ['C#', '.NET Core', 'SQL Server'], experienceYears: 3, status: 'ACTIVE', bio: 'Building scalable enterprise services with .NET and SQL Server.', monthlyPrice: '2,200,000', sessionPrice: '450,000', cvUrl: 'PhamThuHa_CV.pdf' },
  { id: 'M-005', name: 'Hoang Duc Anh', email: 'anh.hoang@example.com', jobTitle: 'Full-stack Developer', skills: ['Node.js', 'MongoDB', 'React'], experienceYears: 5, status: 'ACTIVE', bio: 'Hands-on guidance for full-stack JavaScript applications and REST APIs.', monthlyPrice: '2,400,000', sessionPrice: '500,000', cvUrl: 'HoangDucAnh_FullStack_CV.pdf' },
  { id: 'M-006', name: 'Vu Thanh Tung', email: 'tung.vu@example.com', jobTitle: 'Mobile Engineer', skills: ['Flutter', 'Dart', 'Firebase'], experienceYears: 4, status: 'ACTIVE', bio: 'Cross-platform mobile application development with Flutter.', monthlyPrice: '2,000,000', sessionPrice: '400,000', cvUrl: 'VuThanhTung_CV.pdf' },
  { id: 'M-007', name: 'Dang Bao Ngoc', email: 'ngoc.dang@example.com', jobTitle: 'Data Engineer', skills: ['SQL', 'Data Analysis', 'Python'], experienceYears: 7, status: 'ACTIVE', bio: 'Data pipeline design, ETL processes, and database query optimization.', monthlyPrice: '2,600,000', sessionPrice: '550,000', cvUrl: 'DangBaoNgoc_CV.pdf' },
  { id: 'M-008', name: 'Bui Quoc Huy', email: 'huy.bui@example.com', jobTitle: 'DevOps & Cloud Specialist', skills: ['DevOps', 'Docker', 'AWS'], experienceYears: 6, status: 'ACTIVE', bio: 'Containerizing applications and setting up automated CI/CD pipelines.', monthlyPrice: '2,700,000', sessionPrice: '550,000', cvUrl: 'BuiQuocHuy_CV.pdf' }
];

const MOCK_MENTEES = [
  { id: 'U-101', name: 'Pham Minh Khoa', email: 'khoa.pham@example.com', registeredDate: '18/09/2026', requestsCount: 3, status: 'ACTIVE', emailVerified: true },
  { id: 'U-102', name: 'Nguyen Thi Lan', email: 'lan.nguyen@example.com', registeredDate: '15/09/2026', requestsCount: 1, status: 'ACTIVE', emailVerified: true },
  { id: 'U-103', name: 'Tran Van Hieu', email: 'hieu.tran@example.com', registeredDate: '12/09/2026', requestsCount: 5, status: 'ACTIVE', emailVerified: true },
  { id: 'U-104', name: 'Le Thu Trang', email: 'trang.le@example.com', registeredDate: '09/09/2026', requestsCount: 0, status: 'INACTIVE', emailVerified: true },
  { id: 'U-105', name: 'Do Quang Vinh', email: 'vinh.do@example.com', registeredDate: '05/09/2026', requestsCount: 2, status: 'ACTIVE', emailVerified: true },
  { id: 'U-106', name: 'Ngo Bich Phuong', email: 'phuong.ngo@example.com', registeredDate: '01/09/2026', requestsCount: 4, status: 'ACTIVE', emailVerified: true },
  { id: 'U-107', name: 'Vo Hoang Nam', email: 'nam.vo@example.com', registeredDate: '28/08/2026', requestsCount: 1, status: 'LOCKED', emailVerified: false },
  { id: 'U-108', name: 'Dinh Khanh Linh', email: 'linh.dinh@example.com', registeredDate: '24/08/2026', requestsCount: 6, status: 'ACTIVE', emailVerified: true }
];

const MOCK_APPLICATIONS = [
  { id: 'MA-018', applicantName: 'Nguyen Van A', email: 'an.nguyen@example.com', phone: '0987654321', specialty: 'Backend Engineering', experienceYears: 6, submittedDate: '20/09/2026', status: 'PENDING', bio: 'Experienced Java Spring Boot & Microservices engineer passionate about mentoring junior developers.', skills: ['Java', 'Spring Boot', 'SQL Server', 'REST API'], cvFileName: 'Mentor_CV_NguyenVanA.pdf', cvFileSize: '3.4 MB', linkedinUrl: 'https://linkedin.com/in/nguyenvana', githubUrl: 'https://github.com/nguyenvana', portfolioUrl: 'https://nguyenvana.dev', reviewNote: null },
  { id: 'MA-019', applicantName: 'Tran Thi B', email: 'b.tran@example.com', phone: '0912345678', specialty: 'Frontend Development', experienceYears: 5, submittedDate: '19/09/2026', status: 'PENDING', bio: 'Senior React & TypeScript engineer with 5 years experience building modern web apps.', skills: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js'], cvFileName: 'TranThiB_Frontend_CV.pdf', cvFileSize: '2.1 MB', linkedinUrl: 'https://linkedin.com/in/tranthib', githubUrl: 'https://github.com/tranthib', portfolioUrl: 'https://tranthib.dev', reviewNote: null },
  { id: 'MA-020', applicantName: 'Le Van C', email: 'c.levan@example.com', phone: '0933445566', specialty: 'AI & Machine Learning', experienceYears: 4, submittedDate: '18/09/2026', status: 'PENDING', bio: 'AI Researcher specializing in PyTorch, computer vision, and LLM applications.', skills: ['Python', 'PyTorch', 'Machine Learning', 'FastAPI'], cvFileName: 'LeVanC_AI_Resume.pdf', cvFileSize: '4.8 MB', linkedinUrl: 'https://linkedin.com/in/levanc', githubUrl: 'https://github.com/levanc', portfolioUrl: null, reviewNote: null },
  { id: 'MA-017', applicantName: 'Hoang Duc Anh', email: 'anh.hoang@example.com', phone: '0977889900', specialty: 'Full-stack Development', experienceYears: 5, submittedDate: '15/09/2026', status: 'APPROVED', bio: 'Full-stack engineer with expertise in Node.js, Express, React, and MongoDB.', skills: ['Node.js', 'Express', 'React', 'MongoDB'], cvFileName: 'HoangDucAnh_FullStack_CV.pdf', cvFileSize: '1.9 MB', linkedinUrl: 'https://linkedin.com/in/hoangducanh', githubUrl: 'https://github.com/hoangducanh', portfolioUrl: null, reviewNote: 'Verified and approved by Staff' },
  { id: 'MA-016', applicantName: 'Ngo Bao Ngoc', email: 'ngoc.ngo@example.com', phone: '0944556677', specialty: 'Data Analysis & SQL', experienceYears: 7, submittedDate: '12/09/2026', status: 'REJECTED', bio: 'Data Analyst specializing in SQL Server, PowerBI, and business intelligence.', skills: ['SQL', 'PowerBI', 'Data Analysis'], cvFileName: 'NgoBaoNgoc_Data_CV.pdf', cvFileSize: '5.2 MB', linkedinUrl: 'https://linkedin.com/in/ngobaongoc', githubUrl: null, portfolioUrl: null, reviewNote: 'Uploaded CV indicates less than required 3 years practical software engineering experience.' }
];
async function withCsrf(headers = {}) {
  try {
    const csrf = await apiClient('/api/auth/csrf', { cache: 'no-store' });
    if (csrf?.headerName && csrf?.token) {
      return { ...headers, [csrf.headerName]: csrf.token };
    }
  } catch (err) {
    console.warn('Could not fetch csrf token:', err);
  }
  return headers;
}

export const staffService = {
  async getDashboard() {
    try {
      return await apiClient('/api/staff/dashboard');
    } catch (err) {
      console.warn('Falling back to local staff dashboard data:', err.message);
      return {
        pendingApplicationsCount: MOCK_APPLICATIONS.filter(a => a.status === 'PENDING').length,
        activeMentorsCount: MOCK_MENTORS.length,
        activeMenteesCount: MOCK_MENTEES.length,
        pendingRequestsCount: 37,
        recentActivities: [
          { id: 'MA-018', type: 'APPLICATION', title: 'Mentor Application #MA-018', description: 'Nguyen Van A submitted PDF CV for Java & Spring Boot track', status: 'PENDING', timeAgo: '10 mins ago' },
          { id: 'RQ-0301', type: 'REQUEST', title: 'Mentorship Request #RQ-0301', description: 'Pham Minh Khoa applied for Monthly Mentorship with Minh An Nguyen', status: 'ACCEPTED', timeAgo: '25 mins ago' },
          { id: 'SK-012', type: 'SKILL', title: 'Skill Catalog Updated', description: 'Spring Boot 3 set to ACTIVE by Staff', status: 'ACTIVE', timeAgo: '1 hour ago' },
          { id: 'SR-104', type: 'SUPPORT', title: 'Support Ticket #SR-104', description: 'Escrow refund inquiry processed under the monthly cancellation policy', status: 'RESOLVED', timeAgo: '2 hours ago' },
          { id: 'MA-017', type: 'APPLICATION', title: 'Mentor Application #MA-017', description: 'Tran Thi B approved for Frontend React track', status: 'APPROVED', timeAgo: '4 hours ago' }
        ]
      };
    }
  },

  async getMentors() {
    try {
      return await apiClient('/api/staff/mentors');
    } catch (err) {
      return MOCK_MENTORS;
    }
  },

  async getMentees() {
    try {
      return await apiClient('/api/staff/mentees');
    } catch (err) {
      return MOCK_MENTEES;
    }
  },

  async getApplications() {
    try {
      const data = await apiClient('/api/staff/mentor-applications');
      if (Array.isArray(data)) {
        return data.map(app => {
          const profile = app.profile || {};
          let skills = profile.skills || [];
          if (typeof skills === 'string') {
            skills = skills.split(',').map(s => s.trim()).filter(Boolean);
          }
          return {
            id: app.id,
            applicantName: app.name,
            name: app.name,
            email: app.email,
            status: app.status,
            specialty: profile.category || 'General Software Engineering',
            experienceYears: profile.yearsExperience != null ? profile.yearsExperience : 0,
            submittedDate: app.submittedAt ? new Date(app.submittedAt).toLocaleDateString('en-GB') : 'Recent',
            bio: profile.bio || app.bio || 'No candidate bio provided.',
            skills: skills,
            cvFileName: app.cvFileName || 'CV_Document.pdf',
            cvFileSize: 'PDF Document',
            rejectionReason: app.rejectionReason,
            reviewNote: app.rejectionReason || (app.status === 'APPROVED' ? 'Verified credentials and PDF CV. Approved by Staff.' : '')
          };
        });
      }
      return MOCK_APPLICATIONS;
    } catch (err) {
      return MOCK_APPLICATIONS;
    }
  },

  async approveApplication(id) {
    const headers = await withCsrf();
    return await apiClient(`/api/staff/mentor-applications/${id}/decision`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ decision: 'APPROVED' })
    });
  },

  async rejectApplication(id, reason) {
    const headers = await withCsrf();
    return await apiClient(`/api/staff/mentor-applications/${id}/decision`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ decision: 'REJECTED', reason: reason })
    });
  }
};
