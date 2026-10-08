import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Exposes the VAPID public key so the browser can subscribe to push.
 * The private key never leaves the server.
 */
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ error: "vapid_not_configured" }, { status: 503 });
  }
  return NextResponse.json({ publicKey });
}
