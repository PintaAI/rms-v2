import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const publicRoutes = ["/", "/auth"];
const authApiRoutes = "/api/auth";
const userManualRoute = "/user-manual";
const scannerRoute = "/scanner";
const protectedRoutePrefixes = ["/dashboard", "/onboard", "/superuser"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(authApiRoutes)) {
    return NextResponse.next();
  }

  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith("/auth"));
  const isUserManualRoute = pathname.startsWith(userManualRoute);
  const isScannerRoute = pathname === scannerRoute || pathname.startsWith(`${scannerRoute}/`);
  const isDashboardRoute = /^\/[^/]+\/(admin|staff|teknisi)/.test(pathname);
  const isTokoRootRoute = /^\/[^/]+$/.test(pathname) && !isPublicRoute && !isScannerRoute && !pathname.startsWith(userManualRoute);
  const isProtectedRoute =
    protectedRoutePrefixes.some((route) => pathname.startsWith(route)) ||
    isDashboardRoute ||
    isTokoRootRoute;

  const sessionToken = getSessionCookie(request);

  if (isUserManualRoute || isScannerRoute) {
    return NextResponse.next();
  }

  if (isPublicRoute && sessionToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isProtectedRoute && !sessionToken) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
