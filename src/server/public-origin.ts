function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function resolvePublicOrigin(
  requestOrigin: string | undefined,
  allowedOrigins: string,
  fallbackUrl: string,
  requestUrl?: string,
) {
  const allowed = new Set(
    allowedOrigins
      .split(",")
      .map((value) => normalizeOrigin(value.trim()))
      .filter((value): value is string => Boolean(value)),
  );

  const candidates = [requestOrigin, requestUrl]
    .filter((value): value is string => Boolean(value))
    .map(normalizeOrigin);

  const trustedCandidate = candidates.find(
    (candidate): candidate is string => Boolean(candidate && allowed.has(candidate)),
  );
  if (trustedCandidate) return trustedCandidate;

  // APP_URL is a single URL by contract. Accepting the first valid value keeps
  // local link generation resilient if it is configured like ALLOWED_ORIGINS.
  const fallback = fallbackUrl
    .split(",")
    .map((value) => normalizeOrigin(value.trim()))
    .find((value): value is string => Boolean(value));
  if (!fallback) throw new Error("APP_URL must contain an absolute URL.");
  return fallback;
}
