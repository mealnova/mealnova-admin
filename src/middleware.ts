import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "hc_admin_session";

async function validateSession(request: NextRequest) {
  const meUrl = new URL("/api/auth/me", request.url);
  let response: Response;
  try {
    response = await fetch(meUrl, {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });
  } catch {
    return { ok: false as const, transient: true as const };
  }

  if (response.status >= 500) {
    return { ok: false as const, transient: true as const };
  }

  if (!response.ok) {
    return { ok: false as const, transient: false as const };
  }

  const payload = await response.json().catch(() => null);
  const mustChangePassword = Boolean((payload as { data?: { mustChangePassword?: boolean } } | null)?.data?.mustChangePassword);

  return { ok: true as const, mustChangePassword, transient: false as const };
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");
  const isPasswordRotationRoute = pathname.startsWith("/change-password");
  const isPublicAsset =
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes("favicon");

  if (isPublicAsset) return NextResponse.next();

  if (!token && !isAuthRoute && !isPasswordRotationRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && !isAuthRoute && !isPasswordRotationRoute) {
    const validation = await validateSession(request);

    if (validation.ok && validation.mustChangePassword) {
      return NextResponse.redirect(new URL("/change-password", request.url));
    }

    if (validation.ok) {
      return NextResponse.next();
    }

    if (validation.transient) {
      return NextResponse.next();
    }

    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set(COOKIE_NAME, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
    });
    return response;
  }

  if (token && (isAuthRoute || isPasswordRotationRoute)) {
    const validation = await validateSession(request);

    if (validation.ok && validation.mustChangePassword) {
      if (isPasswordRotationRoute) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/change-password", request.url));
    }

    if (validation.ok) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (validation.transient) {
      return NextResponse.next();
    }

    const response = NextResponse.next();
    response.cookies.set(COOKIE_NAME, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
    });
    if (isPasswordRotationRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  if (isPasswordRotationRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
