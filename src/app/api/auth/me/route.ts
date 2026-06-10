import { NextRequest, NextResponse } from "next/server";
import {
  buildUpstreamRequestSignal,
  getInternalApiBaseUrl,
} from "@/lib/api-base";
import { backendUnavailableResponse, readJsonSafe } from "../_shared";

export async function GET(request: NextRequest) {
  const apiBaseUrl = getInternalApiBaseUrl();
  let upstream: Response;
  try {
    upstream = await fetch(`${apiBaseUrl}/auth/me`, {
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
  return NextResponse.json(data, { status: upstream.status });
}
