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
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

export async function POST(req: NextRequest) {
  const apiBaseUrl = getInternalApiBaseUrl();
  const body = await req.json();
  let upstream: Response;
  try {
    upstream = await fetch(`${apiBaseUrl}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: buildUpstreamRequestSignal(req.signal),
    });
  } catch {
    return backendUnavailableResponse();
  }

  const data = await readJsonSafe(upstream);
  const res = NextResponse.json(data, { status: upstream.status });

  const token = readCookieValue(getUpstreamSetCookies(upstream), COOKIE_NAME);
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
