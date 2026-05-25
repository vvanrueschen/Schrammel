import { NextRequest } from "next/server";
import { createHash } from "crypto";

export function getVoterFingerprint(request: NextRequest, deviceId: string): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  const ua = request.headers.get("user-agent") || "unknown";
  const hash = createHash("sha256")
    .update(`${ip}:${ua}`)
    .digest("hex")
    .slice(0, 16);
  return `${deviceId}:${hash}`;
}