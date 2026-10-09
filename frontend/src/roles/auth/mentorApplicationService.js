import { apiClient } from '../../shared/apiClient.js';

async function post(path, body = {}) {
  const csrf = await apiClient('/api/auth/csrf', { cache: 'no-store' });
  return apiClient(path, { method: 'POST', headers: { [csrf.headerName]: csrf.token }, body: JSON.stringify(body) });
}
const base = '/api/mentor-applications';
export const mentorApplicationService = {
  checkEmail: email => post(base + '/check-email', { email }),
  mine: () => apiClient(base + '/mine', { cache: 'no-store' }),
  submit: body => post(base, body),
  verify: code => post(base + '/verify', { code }),
  resend: () => post(base + '/resend'),
  queue: () => apiClient('/api/staff/mentor-applications', { cache: 'no-store' }),
  decide: (id, decision, reason) => post('/api/staff/mentor-applications/' + encodeURIComponent(id) + '/decision', { decision, reason }),
};

export function fileBase64(file) {
  if (!file) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read the selected file.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.readAsDataURL(file);
  });
}
