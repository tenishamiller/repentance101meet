import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { canPendingAccessPath, pendingMemberLandingPath } from "@/lib/pending-access";
import { isMobileUserAgent } from "@/lib/mobile-detect";
import {
  isMobileAppPath,
  shouldSkipMobileRouting,
  toDesktopPath,
  toMobilePath,
} from "@/lib/mobile-paths";
import { safeCallbackUrl } from "@/lib/safe-callback-url";

const { auth } = NextAuth(authConfig);

const PUBLIC_CHANNEL_SLUGS = new Set(["guidelines", "livestream"]);

function normalizeAppPath(pathname: string): string {
  if (pathname === "/m") return "/";
  if (pathname.startsWith("/m/")) return pathname.slice(2);
  return pathname;
}

function isMemberChannelPath(path: string): boolean {
  const normalized = normalizeAppPath(path);
  if (!normalized.startsWith("/channels/")) return false;
  const slug = normalized.slice("/channels/".length).split("/")[0];
  return Boolean(slug) && !PUBLIC_CHANNEL_SLUGS.has(slug);
}

const protectedPaths = [
  "/dashboard",
  "/settings",
  "/admin",
  "/meeting",
  "/personal-ministry",
  "/messages",
  "/questionnaire",
  "/livestream",
  "/m/dashboard",
  "/m/settings",
  "/m/admin",
  "/m/meeting",
  "/m/personal-ministry",
  "/m/messages",
  "/m/questionnaire",
  "/m/livestream",
];

function mobileAwarePath(path: string, mobile: boolean, desktopPath: string): string {
  if (!mobile) return desktopPath;
  return toMobilePath(desktopPath) ?? `/m${desktopPath === "/" ? "" : desktopPath}`;
}

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const user = req.auth?.user;
  const mobileRoute = isMobileAppPath(path);

  const ua = req.headers.get("user-agent");
  const forceDesktop = req.nextUrl.searchParams.get("desktop") === "1";
  const forceMobile = req.nextUrl.searchParams.get("mobile") === "1";
  const isMobile =
    forceMobile || (!forceDesktop && isMobileUserAgent(ua));

  if (!shouldSkipMobileRouting(path)) {
    if (isMobile && !mobileRoute) {
      const mobilePath = toMobilePath(path);
      if (mobilePath) {
        const url = req.nextUrl.clone();
        url.pathname = mobilePath;
        return NextResponse.redirect(url);
      }
    }

    if (!isMobile && mobileRoute) {
      const url = req.nextUrl.clone();
      url.pathname = toDesktopPath(path);
      return NextResponse.redirect(url);
    }
  }

  const isProtected =
    protectedPaths.some((p) => path === p || path.startsWith(`${p}/`)) ||
    isMemberChannelPath(path);

  if (isProtected && !user) {
    const loginPath =
      path.startsWith("/admin") || path.startsWith("/m/admin")
        ? mobileAwarePath(path, mobileRoute, "/host")
        : mobileAwarePath(path, mobileRoute, "/login");
    const loginUrl = new URL(loginPath, req.url);
    const dest = `${path}${req.nextUrl.search}`;
    if (safeCallbackUrl(dest)) {
      loginUrl.searchParams.set("callbackUrl", dest);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (
    user?.role === "MEMBER" &&
    user.status === "PENDING" &&
    isProtected &&
    !canPendingAccessPath(path, user.questionnaireCompleted === true)
  ) {
    return NextResponse.redirect(
      new URL(
        pendingMemberLandingPath(user.questionnaireCompleted === true, mobileRoute),
        req.url,
      ),
    );
  }

  if (
    user?.role === "MEMBER" &&
    user.status === "PENDING" &&
    !user.questionnaireCompleted &&
    (path === "/" || path === "/m")
  ) {
    return NextResponse.redirect(
      new URL(pendingMemberLandingPath(false, mobileRoute), req.url),
    );
  }

  if (
    user?.role === "MEMBER" &&
    user.status === "PENDING" &&
    !user.questionnaireCompleted &&
    (normalizeAppPath(path) === "/messages" ||
      normalizeAppPath(path).startsWith("/messages/"))
  ) {
    return NextResponse.redirect(
      new URL(pendingMemberLandingPath(false, mobileRoute), req.url),
    );
  }

  if (
    (path.startsWith("/admin") || path.startsWith("/m/admin")) &&
    user?.role !== "ADMIN"
  ) {
    return NextResponse.redirect(
      new URL(mobileAwarePath(path, mobileRoute, "/dashboard"), req.url),
    );
  }

  if (
    (path === "/host" || path === "/m/host") &&
    user?.role === "ADMIN"
  ) {
    return NextResponse.redirect(
      new URL(mobileAwarePath(path, mobileRoute, "/admin"), req.url),
    );
  }

  if (
    (path === "/login" || path === "/m/login") &&
    user
  ) {
    const callback = safeCallbackUrl(req.nextUrl.searchParams.get("callbackUrl"));
    if (callback) {
      return NextResponse.redirect(new URL(callback, req.url));
    }
    if (user.role === "ADMIN") {
      return NextResponse.redirect(
        new URL(mobileAwarePath(path, mobileRoute, "/admin"), req.url),
      );
    }
    if (user.status === "APPROVED") {
      return NextResponse.redirect(
        new URL(mobileAwarePath(path, mobileRoute, "/dashboard"), req.url),
      );
    }
    if (user.status === "PENDING") {
      return NextResponse.redirect(
        new URL(
          pendingMemberLandingPath(user.questionnaireCompleted === true, mobileRoute),
          req.url,
        ),
      );
    }
  }

  if (
    (path === "/dashboard" || path === "/m/dashboard") &&
    user?.status === "PENDING" &&
    user.role !== "ADMIN"
  ) {
    return NextResponse.redirect(
      new URL(
        pendingMemberLandingPath(user.questionnaireCompleted === true, mobileRoute),
        req.url,
      ),
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/",
    "/host",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/dashboard/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/meeting/:path*",
    "/personal-ministry/:path*",
    "/messages/:path*",
    "/questionnaire/:path*",
    "/livestream/:path*",
    "/giving",
    "/giving/:path*",
    "/missed-it",
    "/missed-it/:path*",
    "/channels/:path*",
    "/profile/:path*",
    "/m",
    "/m/host",
    "/m/login",
    "/m/signup",
    "/m/forgot-password",
    "/m/reset-password",
    "/m/dashboard/:path*",
    "/m/settings/:path*",
    "/m/admin/:path*",
    "/m/meeting/:path*",
    "/m/personal-ministry/:path*",
    "/m/messages/:path*",
    "/m/questionnaire/:path*",
    "/m/livestream/:path*",
    "/m/giving",
    "/m/giving/:path*",
    "/m/missed-it",
    "/m/missed-it/:path*",
    "/m/channels/:path*",
    "/m/profile/:path*",
  ],
};
