import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { auth } from "@/lib/auth";
import {
  AFFILIATE_PENDING_REFERRAL_COOKIE,
  DEFAULT_REGISTER_COMMISSION,
  normalizeReferralCode,
} from "@/lib/affiliate";
import prisma from "@/lib/prisma";
import { getRoleRedirectPath } from "@/lib/redirect-by-role";

const publicRoutes = ["/", "/auth"];
const authApiRoutes = "/api/auth";
const userManualRoute = "/user-manual";
const scannerRoute = "/scanner";
const affiliateRoute = "/affiliate";
const noStoreAccessRoute = "/no-store-access";
const protectedRoutePrefixes = ["/dashboard", "/onboard", "/superuser", noStoreAccessRoute];
const publicSingleSegmentRoutes = ["/offline", "/experiment"];
const sharedTokoModules = ["analytics", "inventory", "karyawan", "retail", "service", "supplier-debts"];

type ProxyAuthUser = {
  id: string;
  email: string;
  role: string;
  storeIds: string[];
};

function getCookieSecret(): string {
  return process.env.BETTER_AUTH_SECRET || process.env.DATABASE_URL || "rms-affiliate-dev-secret";
}

function signValue(value: string): string {
  return createHmac("sha256", getCookieSecret()).update(value).digest("hex");
}

function decodePendingReferralCookie(value: string | undefined): string | null {
  if (!value) return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = signValue(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      code?: string;
      expiresAt?: number;
    };

    if (!data.code || !data.expiresAt || data.expiresAt < Date.now()) return null;
    return normalizeReferralCode(data.code);
  } catch {
    return null;
  }
}

async function getProxyAuthUser(request: NextRequest): Promise<ProxyAuthUser | null> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) return null;

  const storeAssignments = await prisma.userStore.findMany({
    where: { userId: session.user.id },
    select: { storeId: true },
  });

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role as string,
    storeIds: storeAssignments.map((assignment) => assignment.storeId),
  };
}

async function attachPendingReferralFromProxy(request: NextRequest, user: ProxyAuthUser) {
  const pendingReferralCookie = request.cookies.get(AFFILIATE_PENDING_REFERRAL_COOKIE)?.value;
  if (!pendingReferralCookie) return false;

  const code = decodePendingReferralCookie(pendingReferralCookie);
  if (!code) return true;

  try {
    const existingReferral = await prisma.referral.findUnique({
      where: { referredUserId: user.id },
      select: { id: true },
    });
    if (existingReferral) return true;

    const affiliator = await prisma.affiliator.findFirst({
      where: { code, status: "active" },
      select: { id: true, userId: true, email: true },
    });

    if (!affiliator || affiliator.userId === user.id || affiliator.email === user.email) {
      return true;
    }

    await prisma.$transaction(async (tx) => {
      const referral = await tx.referral.create({
        data: {
          affiliatorId: affiliator.id,
          referredUserId: user.id,
          referralCode: code,
          registrationCommissionAmount: DEFAULT_REGISTER_COMMISSION,
        },
        select: { id: true, affiliatorId: true },
      });

      await tx.affiliateCommission.create({
        data: {
          affiliatorId: referral.affiliatorId,
          referralId: referral.id,
          userId: user.id,
          plan: "free",
          kind: "registration_bonus",
          periodKey: "registration",
          commissionBaseAmount: null,
          amount: DEFAULT_REGISTER_COMMISSION,
        },
      });
    });

    return true;
  } catch (error) {
    console.error("Failed to attach pending referral in proxy:", error);
    return false;
  }
}

function deletePendingReferralCookie(response: NextResponse) {
  response.cookies.delete(AFFILIATE_PENDING_REFERRAL_COOKIE);
  return response;
}

function getPostAuthDestination(user: ProxyAuthUser) {
  if (user.role === "superuser") {
    return "/superuser";
  }

  const firstStoreId = user.storeIds[0];

  if (!firstStoreId) {
    return user.role === "admin" ? "/onboard" : noStoreAccessRoute;
  }

  return getRoleRedirectPath(firstStoreId, user.role);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(authApiRoutes)) {
    return NextResponse.next();
  }

  const isAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/");
  const isPublicRoute = publicRoutes.some((route) => pathname === route) || isAuthRoute;
  const isUserManualRoute = pathname.startsWith(userManualRoute);
  const isScannerRoute = pathname === scannerRoute || pathname.startsWith(`${scannerRoute}/`);
  const isAffiliateRoute = pathname === affiliateRoute || pathname.startsWith(`${affiliateRoute}/`);
  const isNextInternalRoute = pathname.startsWith("/_next");
  const isDashboardLandingRoute = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isOnboardRoute = pathname === "/onboard" || pathname.startsWith("/onboard/");
  const isSuperuserRoute = pathname === "/superuser" || pathname.startsWith("/superuser/");
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

  if (isProtectedRoute && !sessionToken) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
  }

  const shouldResolveUser = sessionToken && (isPublicRoute || isProtectedRoute);

  if (shouldResolveUser) {
    const user = await getProxyAuthUser(request);

    if (!user) {
      if (isProtectedRoute) {
        return NextResponse.redirect(new URL("/auth", request.url));
      }

      return NextResponse.next();
    }

    const destination = getPostAuthDestination(user);
    const hasPendingReferral = Boolean(request.cookies.get(AFFILIATE_PENDING_REFERRAL_COOKIE)?.value);
    const shouldAttachPendingReferral = isAuthRoute && request.nextUrl.searchParams.get("affiliate_new") === "1";
    const shouldClearPendingReferral = shouldAttachPendingReferral
      ? await attachPendingReferralFromProxy(request, user)
      : hasPendingReferral;

    if (isPublicRoute || isDashboardLandingRoute) {
      const response = NextResponse.redirect(new URL(destination, request.url));
      return shouldClearPendingReferral ? deletePendingReferralCookie(response) : response;
    }

    if (pathname.startsWith(noStoreAccessRoute) && destination !== noStoreAccessRoute) {
      const response = NextResponse.redirect(new URL(destination, request.url));
      return shouldClearPendingReferral ? deletePendingReferralCookie(response) : response;
    }

    if (isOnboardRoute && destination !== "/onboard") {
      const response = NextResponse.redirect(new URL(destination, request.url));
      return shouldClearPendingReferral ? deletePendingReferralCookie(response) : response;
    }

    if (isSuperuserRoute && destination !== "/superuser") {
      const response = NextResponse.redirect(new URL(destination, request.url));
      return shouldClearPendingReferral ? deletePendingReferralCookie(response) : response;
    }

    if (shouldClearPendingReferral) {
      return deletePendingReferralCookie(NextResponse.next());
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
