// Validated return-url handling for the dapp genesis hand-off.
// A dapp can open the token-creation page with `?redirect=<url>` and, after a
// successful genesis, the user is offered a return to that url with the new
// token category appended. Only https is accepted (http is allowed for
// localhost so dapps can test locally); javascript:, data: and other schemes
// are rejected so the redirect cannot be abused as an injection vector.

function isLocalhost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

export function parseReturnUrl(raw: unknown): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string' || value.length === 0) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password) return null;
    if (url.protocol === 'https:') return url.toString();
    if (url.protocol === 'http:' && isLocalhost(url.hostname)) return url.toString();
    return null;
  } catch {
    return null;
  }
}

export function buildReturnUrl(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

export function returnUrlHost(base: string | null): string {
  if (!base) return '';
  try {
    return new URL(base).host;
  } catch {
    return base;
  }
}
