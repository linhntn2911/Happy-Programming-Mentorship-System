import { apiClient } from './apiClient.js';

async function post(endpoint, data = {}) {
  const csrf = await apiClient('/api/auth/csrf', { cache: 'no-store' });
  return apiClient(endpoint, {
    method: 'POST', headers: { [csrf.headerName]: csrf.token }, body: JSON.stringify(data)
  });
}

const CURRENT_USER_KEY = 'hpms.current-user.v1';

export const authService = {
  options: () => apiClient('/api/auth/options', { cache: 'no-store' }),
  login: async data => {
    const user = await post('/api/auth/login', data);
    authService.setCurrentUser(user.mentorVerificationRequired ? null : user);
    return user;
  },
  signupMentee: data => post('/api/auth/signup/mentee', data),
  signupMentor: data => post('/api/auth/signup/mentor', data),
  verifyOtp: async data => {
    const user = await post('/api/auth/verify-otp', data);
    authService.setCurrentUser(user);
    return user;
  },
  resendOtp: data => post('/api/auth/resend-otp', data),
  me: async () => {
    try {
      const user = await apiClient('/api/auth/me', { cache: 'no-store' });
      authService.setCurrentUser(user);
      return user;
    } catch (err) {
      if (err.status === 401) {
        authService.clearCurrentUser();
      }
      throw err;
    }
  },
  logout: async () => {
    try {
      await post('/api/auth/logout');
    } finally {
      authService.clearCurrentUser();
    }
  },
  google: (role, returnTo = null) => post('/api/auth/google', { role, returnTo }),

  getCurrentUser() {
    try {
      const raw = localStorage.getItem(CURRENT_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setCurrentUser(user) {
    try {
      if (user) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    } catch {
      // ignore storage failure
    }
  },
  clearCurrentUser() {
    try {
      localStorage.removeItem(CURRENT_USER_KEY);
    } catch {
      // ignore
    }
  }
};
