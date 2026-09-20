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
  const fallback = normalizeOrigin(fallbackUrl);
  if (!fallback) throw new Error("APP_URL must be an absolute URL.");

  const allowed = new Set(
    allowedOrigins
      .split(",")
      .map((value) => normalizeOrigin(value.trim()))
      .filter((value): value is string => Boolean(value)),
  );

  const candidates = [requestOrigin, requestUrl]
    .filter((value): value is string => Boolean(value))
    .map(normalizeOrigin);

  return candidates.find((candidate): candidate is string => Boolean(candidate && allowed.has(candidate))) ?? fallback;
}
