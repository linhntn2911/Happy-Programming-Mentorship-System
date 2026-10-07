import { apiClient } from './apiClient.js';
import {
  developmentActiveSkills,
  developmentMentorProfile,
  loadWithDevelopmentFallback,
} from './mentorDemoData.js';

export const mentorService = {
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
    return apiClient('/api/mentors/me/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  },

  async getActiveSkills() {
    return loadWithDevelopmentFallback(
      () => apiClient('/api/skills?active=true'),
      developmentActiveSkills
    );
  }
};
