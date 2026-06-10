import { NextRequest, NextResponse } from "next/server";
import {
  buildUpstreamRequestSignal,
  getInternalApiBaseUrl,
} from "@/lib/api-base";
import { backendUnavailableResponse, readJsonSafe } from "../_shared";

export async function POST(req: NextRequest) {
  const apiBaseUrl = getInternalApiBaseUrl();
  const body = await req.json();
  let upstream: Response;
  try {
    upstream = await fetch(`${apiBaseUrl}/auth/forgot-password`, {
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
  return NextResponse.json(data, { status: upstream.status });
}
