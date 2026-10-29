import { NextResponse, type NextRequest } from "next/server";
import { reconcilePendingSrs } from "@/lib/srs/reconcile";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Invoked by the existing 15-minute GitHub Actions schedule.
 * No browser route or user-controllable identity is accepted.
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || token !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const summary = await reconcilePendingSrs({ limit: 20 });
  if (summary.failed > 0) {
    return NextResponse.json(
      { ok: false, reason: "partial_failure", ...summary },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, ...summary });
}
