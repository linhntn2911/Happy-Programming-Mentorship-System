/**
 * Authentication & Session Service - HappyProgramming
 * Manages user session, role validation, and login/logout state.
 * Automatically determines role_code from user account credentials.
 */

const AUTH_KEY = 'hpms.auth.user.v1';

export const authService = {
  getCurrentUser() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isLoggedIn() {
    return !!this.getCurrentUser();
  },

  hasRole(roleCode) {
    const user = this.getCurrentUser();
    if (!user || !user.role_code) return false;
    if (user.role_code === 'ADMIN') return true; // ADMIN has super-set permissions
    return user.role_code === roleCode;
  },

  isStaff() {
    return this.hasRole('STAFF');
  },

  login(email, password) {
    let fullName = 'User';
    let assignedRole = 'MENTEE';

    const normalizedEmail = (email || '').toLowerCase().trim();

    if (normalizedEmail.includes('staff')) {
      assignedRole = 'STAFF';
      fullName = 'Nguyen Van Staff';
    } else if (normalizedEmail.includes('admin')) {
      assignedRole = 'ADMIN';
      fullName = 'System Administrator';
    } else if (normalizedEmail.includes('mentor') || normalizedEmail.includes('an.nguyen')) {
      assignedRole = 'MENTOR';
      fullName = 'Minh An Nguyen';
    } else if (normalizedEmail.includes('khoa') || normalizedEmail.includes('mentee')) {
      assignedRole = 'MENTEE';
      fullName = 'Pham Minh Khoa';
    } else {
      fullName = email.split('@')[0] || 'User';
      assignedRole = 'MENTEE';
    }

    const user = {
      email: normalizedEmail || 'user@happyprogramming.vn',
      full_name: fullName,
      role_code: assignedRole,
      login_at: new Date().toISOString()
    };

    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return user;
  },

  logout() {
    localStorage.removeItem(AUTH_KEY);
  }
};
