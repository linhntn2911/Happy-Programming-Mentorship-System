/**
 * Centralized API client for HappyProgramming frontend.
 */
export async function apiClient(endpoint, options = {}) {
  const config = {
    credentials: 'same-origin',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(endpoint, config);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error = new Error(errorBody.message || 'Something went wrong. Please try again.');
    error.status = response.status;
    throw error;
  }

  const result = await response.json();
  return result.data !== undefined ? result.data : result;
}
