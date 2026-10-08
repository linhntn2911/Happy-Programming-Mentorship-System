import { mentorMatchesCategory } from '../constants/mentorDiscovery.js';
import { apiClient } from './apiClient.js';
import {
  developmentActiveSkills,
  developmentMentorProfile,
  loadWithDevelopmentFallback,
} from './mentorDemoData.js';

export const mentorService = {
  async getProfile(id) {
    const mentors = await apiClient('/api/mentors');
    return mentors.find(mentor => mentor.id === id) || null;
  },
  async getFeaturedMentors() {
    return apiClient('/api/mentors');
  },

  async getMyProfile() {
    return loadWithDevelopmentFallback(
      () => apiClient('/api/mentors/me/profile'),
      developmentMentorProfile
    );
  },

  async updateMyProfile(profile) {
    const headers = {};
    try {
      const csrf = await apiClient('/api/auth/csrf', { cache: 'no-store' });
      if (csrf?.headerName && csrf?.token) {
        headers[csrf.headerName] = csrf.token;
      }
    } catch (err) {
      console.warn('Could not fetch csrf token:', err);
    }
    return apiClient('/api/mentors/me/profile', {
      method: 'PUT',
      headers,
      body: JSON.stringify(profile),
    });
  },

  async getActiveSkills() {
    return loadWithDevelopmentFallback(
      () => apiClient('/api/skills?active=true'),
      developmentActiveSkills
    );
  },

  async searchMentors(filters = {}) {
    const params = new URLSearchParams();
    const { categories = [], ...apiFilters } = filters;
    Object.entries(apiFilters).forEach(([key, value]) => {
      if (Array.isArray(value)) value.forEach(item => params.append(key, item));
      else if (value !== '' && value !== undefined && value !== null && value !== false) params.set(key, value);
    });
    const mentors = await apiClient(`/api/mentors?${params.toString()}`);
    return categories.length ? mentors.filter(mentor => categories.some(category => mentorMatchesCategory(mentor, category))) : mentors;
  }
};
