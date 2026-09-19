export type ApiError = { error: { code: string; message: string; fields?: Record<string, string> } };
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, { credentials: 'include', ...options, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers } });
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error(response.ok ? 'The server returned an unexpected response.' : `The server could not complete the request (${response.status}).`);
  }
  const body = await response.json() as { data: T } | ApiError;
  if (!response.ok || !('data' in body)) throw new Error('error' in body ? body.error.message : 'Request failed.');
  return body.data;
}
