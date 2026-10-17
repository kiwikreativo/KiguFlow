export type ApiError = { error: { code: string; message: string; fields?: Record<string, string> } };

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

const authenticationCodes = new Set(['AUTH_REQUIRED', 'SESSION_INVALID', 'SESSION_INACTIVE']);

export function isAuthenticationError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError && error.status === 401 && authenticationCodes.has(error.code);
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, { credentials: 'include', ...options, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers } });
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) throw new ApiRequestError(response.ok ? 'The server returned an unexpected response.' : `The server could not complete the request (${response.status}).`, response.status, 'UNEXPECTED_RESPONSE');
  const body = await response.json() as { data: T } | ApiError;
  if (!response.ok || !('data' in body)) {
    const error = 'error' in body ? body.error : { code: 'REQUEST_FAILED', message: 'Request failed.' };
    throw new ApiRequestError(error.message, response.status, error.code, error.fields);
  }
  return body.data;
}
