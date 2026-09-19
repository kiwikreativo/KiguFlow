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
) {
  const fallback = normalizeOrigin(fallbackUrl);
  if (!fallback) throw new Error("APP_URL must be an absolute URL.");

  if (!requestOrigin) return fallback;
  const candidate = normalizeOrigin(requestOrigin);
  const allowed = new Set(
    allowedOrigins
      .split(",")
      .map((value) => normalizeOrigin(value.trim()))
      .filter((value): value is string => Boolean(value)),
  );

  return candidate && allowed.has(candidate) ? candidate : fallback;
}
