import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  const path = request.nextUrl.pathname;

  const protectedPaths = [
    "/dashboard",
    "/settings",
    "/admin",
    "/meeting",
    "/personal-ministry",
    "/channels/resource",
    "/channels/accountability",
    "/channels/tough-questions",
    "/channels/general",
  ];

  const isProtected = protectedPaths.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (path.startsWith("/admin") && token?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/meeting/:path*",
    "/personal-ministry/:path*",
    "/channels/resource/:path*",
    "/channels/accountability/:path*",
    "/channels/tough-questions/:path*",
    "/channels/general/:path*",
  ],
};
