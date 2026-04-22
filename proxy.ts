import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/", "/auth"];
const authApiRoutes = "/api/auth";
const onboardRoute = "/onboard";
const userManualRoute = "/user-manual";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(authApiRoutes)) {
    return NextResponse.next();
  }

  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith("/auth"));
  const isOnboardRoute = pathname.startsWith(onboardRoute);
  const isUserManualRoute = pathname.startsWith(userManualRoute);
  const isDashboardRoute = pathname.match(/^\/[^/]+\/(admin|staff|teknisi)/);

  const sessionToken = request.cookies.get("better-auth.session_token")?.value;

  if (isUserManualRoute) {
    return NextResponse.next();
  }

  if (isPublicRoute && sessionToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isOnboardRoute && !sessionToken) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  if (isDashboardRoute && !sessionToken) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
