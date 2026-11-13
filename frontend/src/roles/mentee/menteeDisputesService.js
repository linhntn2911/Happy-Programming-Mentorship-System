import { apiClient } from '../../shared/apiClient.js';

async function csrfHeaders() {
  const csrf = await apiClient('/api/auth/csrf', { cache: 'no-store' });
  if (!csrf?.headerName || !csrf?.token) throw new Error('Your session could not be verified. Refresh and try again.');
  return { [csrf.headerName]: csrf.token };
}

export const menteeDisputesService = {
  list() { return apiClient('/api/disputes/mine', { cache: 'no-store' }); },
  eligibleTargets() { return apiClient('/api/disputes/eligible-targets', { cache: 'no-store' }); },
  get(id) { return apiClient(`/api/disputes/${encodeURIComponent(id)}`, { cache: 'no-store' }); },
  evidenceUrl(disputeId, evidenceId) {
    return `/api/disputes/${encodeURIComponent(disputeId)}/evidence/${encodeURIComponent(evidenceId)}`;
  },
  receiptUrl(disputeId) {
    return `/api/disputes/${encodeURIComponent(disputeId)}/receipt`;
  },
  targetByRequest(requestId) {
    return apiClient(`/api/disputes/target-by-request/${encodeURIComponent(requestId)}`, { cache: 'no-store' });
  },
  async submit(values) {
    const form = new FormData();
    if (values.targetType) form.append('targetType', values.targetType);
    if (values.targetId) form.append('targetId', String(values.targetId));
    if (values.requestId) form.append('requestId', String(values.requestId));
    form.append('category', values.category);
    form.append('description', values.description);
    form.append('termsAccepted', String(values.termsAccepted));
    if (values.bankName) form.append('bankName', values.bankName.trim());
    if (values.accountNumber) form.append('accountNumber', values.accountNumber.trim());
    if (values.accountName) form.append('accountName', values.accountName.trim());
    (values.evidence || []).forEach(file => form.append('evidence', file));
    const response = await fetch('/api/disputes', {
      method: 'POST', credentials: 'same-origin', headers: await csrfHeaders(), body: form,
    });
    let result = {};
    try { result = await response.json(); } catch { result = {}; }
    if (!response.ok) throw new Error(result.message || `Submission failed with status ${response.status}.`);
    return result.data !== undefined ? result.data : result;
  },
};
