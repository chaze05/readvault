import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySession } from "@/lib/session";

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

  if (!session && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (session && pathname === "/login") {
    const libraryUrl = request.nextUrl.clone();
    libraryUrl.pathname = "/library";
    return NextResponse.redirect(libraryUrl);
  }

  return NextResponse.next({ request });
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
