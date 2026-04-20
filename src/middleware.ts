import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected routes that require tenant auth
  const protectedPaths = ["/platform-admin"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected) {
    // Check for tenant-token in cookies (will be set client-side too)
    // For now, we just let the client-side handle the redirect
    // This middleware just adds security headers
    const response = NextResponse.next();
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/platform-admin/:path*"],
};
