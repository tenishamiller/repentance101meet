import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { canPendingAccessPath } from "@/lib/pending-access";

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
];

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const user = req.auth?.user;

  const isProtected = protectedPaths.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  if (isProtected && !user) {
    const loginPath = path.startsWith("/admin") ? "/host" : "/login";
    return NextResponse.redirect(new URL(loginPath, req.url));
  }

  if (
    user?.role === "MEMBER" &&
    user.status === "PENDING" &&
    isProtected &&
    !canPendingAccessPath(path)
  ) {
    return NextResponse.redirect(new URL("/messages", req.url));
  }

  if (path.startsWith("/admin") && user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (path === "/host" && user?.role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  if (path === "/login" && user) {
    if (user.role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    if (user.status === "APPROVED") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (user.status === "PENDING") {
      return NextResponse.redirect(new URL("/messages", req.url));
    }
  }

  if (path === "/dashboard" && user?.status === "PENDING" && user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/messages", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/host",
    "/login",
    "/dashboard/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/meeting/:path*",
    "/personal-ministry/:path*",
    "/messages/:path*",
    "/livestream/:path*",
    "/channels/resource/:path*",
    "/channels/accountability/:path*",
    "/channels/tough-questions/:path*",
    "/channels/general/:path*",
  ],
};
