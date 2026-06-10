import { NextRequest, NextResponse } from "next/server";
import {
  buildUpstreamRequestSignal,
  getInternalApiBaseUrl,
} from "@/lib/api-base";
import { backendUnavailableResponse, readJsonSafe } from "../_shared";

const COOKIE_NAME = "hc_admin_session";

export async function POST(request: NextRequest) {
  const apiBaseUrl = getInternalApiBaseUrl();
  let upstream: Response;
  try {
    upstream = await fetch(`${apiBaseUrl}/auth/logout`, {
      method: "POST",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
      signal: buildUpstreamRequestSignal(request.signal),
    });
  } catch {
    return backendUnavailableResponse();
  }

  const data = await readJsonSafe(upstream);
  const res = NextResponse.json(data, { status: upstream.status });
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return res;
}
