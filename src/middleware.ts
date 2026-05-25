import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const RATE_LIMITED_PATHS = ["/api/vote", "/api/wish/vote", "/api/wish"];

export function middleware(request: NextRequest) {
  if (request.method === "GET") {
    return NextResponse.next();
  }

  if (!RATE_LIMITED_PATHS.some((p) => request.nextUrl.pathname === p)) {
    return NextResponse.next();
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  const { allowed, retryAfterMs } = rateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};