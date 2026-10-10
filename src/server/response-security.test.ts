import { describe, expect, it } from 'vitest';
import { secureResponse } from './response-security';

describe('worker response security headers', () => {
  it('adds browser protections while preserving the response', async () => {
    const response = secureResponse(new Response('ok', { status: 201, headers: { 'Cache-Control': 'private, no-store' } }), 'production');
    expect(await response.text()).toBe('ok');
    expect(response.status).toBe(201);
    expect(response.headers.get('Content-Security-Policy')).toContain("object-src 'none'");
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
