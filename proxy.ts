import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const publicRoutes = ["/", "/auth"];
const authApiRoutes = "/api/auth";
const userManualRoute = "/user-manual";
const scannerRoute = "/scanner";
const affiliateRoute = "/affiliate";
const protectedRoutePrefixes = ["/dashboard", "/onboard", "/superuser"];
const publicSingleSegmentRoutes = ["/offline", "/experiment"];
const sharedTokoModules = ["analytics", "inventory", "karyawan", "retail", "service", "supplier-debts"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(authApiRoutes)) {
    return NextResponse.next();
  }

  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith("/auth"));
  const isUserManualRoute = pathname.startsWith(userManualRoute);
  const isScannerRoute = pathname === scannerRoute || pathname.startsWith(`${scannerRoute}/`);
  const isAffiliateRoute = pathname === affiliateRoute || pathname.startsWith(`${affiliateRoute}/`);
  const isNextInternalRoute = pathname.startsWith("/_next");
  const isDashboardRoute = /^\/[^/]+\/(admin|staff|teknisi)/.test(pathname);
  const isExcludedSharedTokoRoute = isPublicRoute || isScannerRoute || isUserManualRoute || isAffiliateRoute || isNextInternalRoute;
  const isTokoRootRoute = /^\/[^/]+$/.test(pathname) && !isExcludedSharedTokoRoute;
  const sharedModulePattern = new RegExp(`^/[^/]+/(${sharedTokoModules.join("|")})(/|$)`);
  const isSharedTokoModuleRoute = sharedModulePattern.test(pathname) && !isExcludedSharedTokoRoute;
  const isProtectedRoute =
    protectedRoutePrefixes.some((route) => pathname.startsWith(route)) ||
    isDashboardRoute ||
    (isTokoRootRoute && !publicSingleSegmentRoutes.includes(pathname)) ||
    isSharedTokoModuleRoute;

  const sessionToken = getSessionCookie(request);

  if (isUserManualRoute || isScannerRoute || isAffiliateRoute || isNextInternalRoute) {
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
