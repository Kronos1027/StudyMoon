import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/admin";

export const dynamic = "force-dynamic";

/**
 * Supabase keepalive (doc section 2): a tiny daily query prevents the free
 * project from pausing after 7 idle days. Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  // Credentials in query parameters leak into access logs and URLs.
  // Require the exact Bearer header, as every scheduled workflow already uses.
  if (!process.env.CRON_SECRET ||
      request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  }

  const { error } = await admin.from("areas").select("id").limit(1);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
