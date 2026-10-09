import { apiClient } from '../../shared/apiClient.js';
async function withCsrf() {
  const csrf = await apiClient('/api/auth/csrf', { cache: 'no-store' });
  return { [csrf.headerName]: csrf.token };
}
export const staffService = {
  access: () => apiClient('/api/staff/access', { cache: 'no-store' }),
  getDashboard: () => apiClient('/api/staff/dashboard'),
  getMentors: () => apiClient('/api/staff/mentors'),
  getMentees: () => apiClient('/api/staff/mentees'),
  getRequests: () => apiClient('/api/staff/requests'),
  getSkills: () => apiClient('/api/staff/skills'),
  async getApplications() {
    const data = await apiClient('/api/staff/mentor-applications');
    if (!Array.isArray(data)) throw new Error('Invalid application response.');
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
  },
  async approveApplication(id) {
    return apiClient(`/api/staff/mentor-applications/${id}/decision`, { method: 'POST', headers: await withCsrf(), body: JSON.stringify({decision:'APPROVED'}) });
  },
  async rejectApplication(id, reason) {
    return apiClient(`/api/staff/mentor-applications/${id}/decision`, { method: 'POST', headers: await withCsrf(), body: JSON.stringify({decision:'REJECTED',reason}) });
  }
};
