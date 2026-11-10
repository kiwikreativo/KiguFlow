import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiRequestError, isAbortError, isAuthenticationError } from './api';

afterEach(() => vi.unstubAllGlobals());

describe('API request errors', () => {
  it('recognizes only explicit authentication failures', () => {
    expect(isAuthenticationError(new ApiRequestError('Expired', 401, 'SESSION_INACTIVE'))).toBe(true);
    expect(isAuthenticationError(new ApiRequestError('Failed', 500, 'SESSION_INACTIVE'))).toBe(false);
    expect(isAuthenticationError(new ApiRequestError('Denied', 401, 'OTHER_ERROR'))).toBe(false);
  });

  it('preserves status and code without treating server errors as authentication failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'DATABASE_ERROR', message: 'Unavailable' } }), { status: 500, headers: { 'Content-Type': 'application/json' } })));
    const error = await api('/admin/projects').catch((value) => value);
    expect(error).toMatchObject({ status: 500, code: 'DATABASE_ERROR', message: 'Unavailable' });
    expect(isAuthenticationError(error)).toBe(false);
  });

  it('leaves network and canceled requests distinguishable', async () => {
    const networkError = new TypeError('Failed to fetch');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(networkError));
    await expect(api('/admin/projects')).rejects.toBe(networkError);
    expect(isAuthenticationError(networkError)).toBe(false);
    expect(isAbortError(new DOMException('Aborted', 'AbortError'))).toBe(true);
  });
});
