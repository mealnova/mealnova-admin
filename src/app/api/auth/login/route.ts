import { NextRequest, NextResponse } from "next/server";
import {
  buildUpstreamRequestSignal,
  getInternalApiBaseUrl,
} from "@/lib/api-base";
import {
  backendUnavailableResponse,
  getUpstreamSetCookies,
  readCookieValue,
  readJsonSafe,
} from "../_shared";

const COOKIE_NAME = "hc_admin_session";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export async function POST(req: NextRequest) {
  const apiBaseUrl = getInternalApiBaseUrl();
  const body = await req.json();

  let upstream: Response;
  try {
    upstream = await fetch(`${apiBaseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: buildUpstreamRequestSignal(req.signal),
    });
  } catch {
    return backendUnavailableResponse();
  }

  const data = await readJsonSafe(upstream);

  if (!upstream.ok) {
    const res = NextResponse.json(data, { status: upstream.status });
    const retryAfter = upstream.headers.get("retry-after");
    if (retryAfter) {
      res.headers.set("Retry-After", retryAfter);
    }
    return res;
  }

  // Extract the token the NestJS API set in its own Set-Cookie header
  // so we can re-set it on our own origin for middleware to read
  const token = readCookieValue(getUpstreamSetCookies(upstream), COOKIE_NAME);

  const res = NextResponse.json(data, { status: 200 });

  if (token) {
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  }

  return res;
}
