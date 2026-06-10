export const DEFAULT_API_BASE_URL = "http://localhost:4000/api/v1";
const API_PROXY_TIMEOUT_MS = Number(
  process.env.API_PROXY_TIMEOUT_MS ||
  process.env.NEXT_PUBLIC_API_TIMEOUT_MS ||
  20000,
);

function getDefaultApiBaseUrl() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "INTERNAL_API_URL, API_URL, or NEXT_PUBLIC_API_URL must be configured for admin in production",
    );
  }

  return DEFAULT_API_BASE_URL;
}

function ensureApiV1(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

export function getInternalApiBaseUrl(): string {
  return ensureApiV1(
    process.env.INTERNAL_API_URL ||
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    getDefaultApiBaseUrl(),
  );
}

export function buildUpstreamRequestSignal(
  signal?: AbortSignal | null,
): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(API_PROXY_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
}
