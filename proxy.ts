import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "@/lib/auth";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-toyota-incentive-calculator-key-2026";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const tokenCookie = request.cookies.get("token");
  const token = tokenCookie?.value;

  let user = null;
  if (token) {
    user = await verifyJWT(token, JWT_SECRET);
  }

  // Paths requiring Admin role
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const response = NextResponse.redirect(new URL("/login/admin", request.url));
      response.cookies.delete("token");
      return response;
    }
    if (user.role !== "admin") {
      return NextResponse.redirect(new URL("/officer/dashboard", request.url));
    }
  }

  // Paths requiring Officer (Sales) role
  if (pathname.startsWith("/officer")) {
    if (!user) {
      const response = NextResponse.redirect(new URL("/login/officer", request.url));
      response.cookies.delete("token");
      return response;
    }
    if (user.role !== "sales") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  // Intercept login screens when users are already authenticated
  if (pathname.startsWith("/login")) {
    if (user) {
      if (user.role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      } else if (user.role === "sales") {
        return NextResponse.redirect(new URL("/officer/dashboard", request.url));
      }
    }
  }

  return NextResponse.next();
}

// Configure proxy matchers
export const config = {
  matcher: ["/admin/:path*", "/officer/:path*", "/login/:path*"],
};
