const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

export class ApiClientError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
  }
}

export async function apiClient(endpoint, options = {}) {
  const {
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    signal: externalSignal,
    headers: requestHeaders,
    ...requestOptions
  } = options;
  const controller = new AbortController();
  let timedOut = false;

  const abortFromExternalSignal = () => controller.abort();
  if (externalSignal?.aborted) {
    controller.abort();
  } else {
    externalSignal?.addEventListener('abort', abortFromExternalSignal, { once: true });
  }

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      credentials: 'same-origin',
      ...requestOptions,
      headers: {
        'Content-Type': 'application/json',
        ...requestHeaders,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorBody = {};
      try {
        errorBody = await response.json();
      } catch {
        errorBody = {};
      }
      throw new ApiClientError(
        errorBody.message || `HTTP error! status: ${response.status}`,
        response.status
      );
    }

    const result = await response.json();
    return result.data !== undefined ? result.data : result;
  } catch (error) {
    if (timedOut) {
      throw new ApiClientError('The request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', abortFromExternalSignal);
  }
}
