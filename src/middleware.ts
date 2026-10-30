import { NextResponse, type NextRequest } from "next/server";

import { AUTHENTICATED_CACHE_HEADERS } from "@/lib/http";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

function withNoStore(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(AUTHENTICATED_CACHE_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/library",
  "/recent",
  "/bookmarks",
  "/settings",
  "/reader",
  "/story-time",
];

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!session && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return withNoStore(NextResponse.redirect(loginUrl));
  }

  if (
    session?.mustChangePassword &&
    isProtected &&
    !pathname.startsWith("/settings")
  ) {
    const settingsUrl = request.nextUrl.clone();
    settingsUrl.pathname = "/settings";
    settingsUrl.search = "?security=password";
    return withNoStore(NextResponse.redirect(settingsUrl));
  }

  if (session && pathname === "/login") {
    if (request.nextUrl.searchParams.get("expired") === "1") {
      const response = NextResponse.next({ request });
      response.cookies.delete(SESSION_COOKIE);
      return withNoStore(response);
    }

    const settingsUrl = request.nextUrl.clone();
    settingsUrl.pathname = "/settings";
    settingsUrl.search = session.mustChangePassword
      ? "?security=password"
      : "";
    return withNoStore(NextResponse.redirect(settingsUrl));
  }

  return withNoStore(NextResponse.next({ request }));
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/library/:path*",
    "/recent/:path*",
    "/bookmarks/:path*",
    "/settings/:path*",
    "/reader/:path*",
    "/story-time/:path*",
    "/login",
  ],
};
