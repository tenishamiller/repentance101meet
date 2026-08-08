import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { canPendingAccessPath } from "@/lib/pending-access";
import { isMobileUserAgent } from "@/lib/mobile-detect";
import {
  isMobileAppPath,
  shouldSkipMobileRouting,
  toDesktopPath,
  toMobilePath,
} from "@/lib/mobile-paths";

const { auth } = NextAuth(authConfig);

const protectedPaths = [
  "/dashboard",
  "/settings",
  "/admin",
  "/meeting",
  "/personal-ministry",
  "/messages",
  "/channels/resource",
  "/channels/accountability",
  "/channels/tough-questions",
  "/channels/general",
  "/livestream",
  "/m/dashboard",
  "/m/settings",
  "/m/admin",
  "/m/meeting",
  "/m/personal-ministry",
  "/m/messages",
  "/m/channels/resource",
  "/m/channels/accountability",
  "/m/channels/tough-questions",
  "/m/channels/general",
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

  const isProtected = protectedPaths.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  if (isProtected && !user) {
    const loginPath =
      path.startsWith("/admin") || path.startsWith("/m/admin")
        ? mobileAwarePath(path, mobileRoute, "/host")
        : mobileAwarePath(path, mobileRoute, "/login");
    return NextResponse.redirect(new URL(loginPath, req.url));
  }

  if (
    user?.role === "MEMBER" &&
    user.status === "PENDING" &&
    isProtected &&
    !canPendingAccessPath(path)
  ) {
    return NextResponse.redirect(
      new URL(mobileAwarePath(path, mobileRoute, "/messages"), req.url),
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
        new URL(mobileAwarePath(path, mobileRoute, "/messages"), req.url),
      );
    }
  }

  if (
    (path === "/dashboard" || path === "/m/dashboard") &&
    user?.status === "PENDING" &&
    user.role !== "ADMIN"
  ) {
    return NextResponse.redirect(
      new URL(mobileAwarePath(path, mobileRoute, "/messages"), req.url),
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
    "/dashboard/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/meeting/:path*",
    "/personal-ministry/:path*",
    "/messages/:path*",
    "/livestream/:path*",
    "/channels/:path*",
    "/m",
    "/m/host",
    "/m/login",
    "/m/signup",
    "/m/dashboard/:path*",
    "/m/settings/:path*",
    "/m/admin/:path*",
    "/m/meeting/:path*",
    "/m/personal-ministry/:path*",
    "/m/messages/:path*",
    "/m/livestream/:path*",
    "/m/channels/:path*",
  ],
};
