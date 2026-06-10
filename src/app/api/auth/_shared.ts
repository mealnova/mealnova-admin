import { NextResponse } from "next/server";

export async function readJsonSafe(response: Response) {
  return response.json().catch(() => ({}));
}

function splitSetCookieHeader(value: string) {
  return value
    .split(/,(?=\s*[^;,=\s]+=[^;,]+)/g)
    .map((cookie) => cookie.trim())
    .filter(Boolean);
}

export function getUpstreamSetCookies(upstream: Response) {
  const upstreamHeaders = upstream.headers as Headers & {
    getSetCookie?: () => string[];
  };

  const cookies = upstreamHeaders.getSetCookie?.();
  if (cookies?.length) return cookies;

  const single = upstream.headers.get("set-cookie");
  return single ? splitSetCookieHeader(single) : [];
}

export function readCookieValue(setCookies: string[], cookieName: string) {
  for (const cookie of setCookies) {
    const [pair] = cookie.split(";", 1);
    if (!pair?.startsWith(`${cookieName}=`)) {
      continue;
    }

    return pair.slice(cookieName.length + 1);
  }

  return null;
}

export function backendUnavailableResponse() {
  return NextResponse.json(
    {
      success: false,
      message: "Authentication service is temporarily unavailable. Please try again.",
    },
    { status: 503 },
  );
}
