const AUTH_BASE = "/api/auth";
const SESSION_CACHE_KEY = "hc_admin_cached_session";

export interface AuthSessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  mustChangePassword: boolean;
}

export class AuthServiceUnavailableError extends Error {
  constructor() {
    super("Authentication service is temporarily unavailable");
  }
}

export class AuthRateLimitError extends Error {
  retryAfterSeconds: number;
  retryAt?: string;

  constructor(retryAfterSeconds: number, retryAt?: string) {
    super(`Too many sign-in attempts. Try again in ${formatRetryAfter(retryAfterSeconds)}.`);
    this.name = "AuthRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
    this.retryAt = retryAt;
  }
}

function formatRetryAfter(seconds: number) {
  const totalSeconds = Math.max(1, Math.ceil(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  if (minutes > 0 && remainingSeconds > 0) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"}`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  return `${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"}`;
}

function readRetryAfterSeconds(
  err: { retryAfterSeconds?: unknown },
  res: Response,
) {
  const fromBody =
    typeof err.retryAfterSeconds === "number"
      ? err.retryAfterSeconds
      : typeof err.retryAfterSeconds === "string"
        ? Number(err.retryAfterSeconds)
        : NaN;

  if (Number.isFinite(fromBody) && fromBody > 0) {
    return Math.ceil(fromBody);
  }

  const fromHeader = Number(res.headers.get("Retry-After"));
  if (Number.isFinite(fromHeader) && fromHeader > 0) {
    return Math.ceil(fromHeader);
  }

  return null;
}

export function cacheSession(user: AuthSessionUser | null) {
  if (typeof window === "undefined") return;
  if (!user) {
    window.sessionStorage.removeItem(SESSION_CACHE_KEY);
    return;
  }
  window.sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(user));
}

export function readCachedSession(): AuthSessionUser | null {
  if (typeof window === "undefined") return null;
  const cached = window.sessionStorage.getItem(SESSION_CACHE_KEY);
  if (!cached) return null;
  try {
    return JSON.parse(cached) as AuthSessionUser;
  } catch {
    window.sessionStorage.removeItem(SESSION_CACHE_KEY);
    return null;
  }
}

export function clearCachedSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SESSION_CACHE_KEY);
}

export async function loginAction(email: string, password: string) {
  // POST to our own Next.js proxy route so the cookie is set on our origin
  // (the middleware reads cookies from localhost:3001, not localhost:4000)
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({} as {
      message?: string;
      data?: { message?: string };
      retryAfterSeconds?: unknown;
      retryAt?: unknown;
    }));
    if (res.status === 429) {
      const retryAfterSeconds = readRetryAfterSeconds(err, res);
      throw new AuthRateLimitError(
        retryAfterSeconds ?? 60,
        typeof err.retryAt === "string" ? err.retryAt : undefined,
      );
    }
    throw new Error(
      (err as { message?: string; data?: { message?: string } }).message ||
      (err as { data?: { message?: string } }).data?.message ||
      "Invalid email or password"
    );
  }
  return res.json();
}

export async function logoutAction() {
  await fetch("/api/auth/logout", { method: "POST" });
  clearCachedSession();
}

export async function requestPasswordReset(email: string) {
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { message?: string; error?: string }).message ||
      (data as { error?: string }).error ||
      "Failed to request password reset"
    );
  }
  return data as { message?: string };
}

export async function resetPassword(token: string, newPassword: string) {
  const res = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { message?: string; error?: string }).message ||
      (data as { error?: string }).error ||
      "Failed to reset password"
    );
  }
  return data as { message?: string };
}

export async function changePasswordAction(currentPassword: string, newPassword: string) {
  const res = await fetch("/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { message?: string; error?: string }).message ||
      (data as { error?: string }).error ||
      "Failed to change password"
    );
  }
  return data as { message?: string };
}

export async function getSession() {
  const res = await fetch(`${AUTH_BASE}/me`, { credentials: "include", cache: "no-store" });
  if (res.status >= 500) {
    throw new AuthServiceUnavailableError();
  }
  if (!res.ok) {
    clearCachedSession();
    return null;
  }
  const data = await res.json();
  const user = data.data as AuthSessionUser | null;
  cacheSession(user);
  return user;
}
