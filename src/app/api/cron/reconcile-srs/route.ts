import { NextResponse, type NextRequest } from "next/server";
import { reconcilePendingSrs } from "@/lib/srs/reconcile";
import { getSrsBacklogHealth } from "@/lib/srs/monitor";

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
  try {
    const backlog = await getSrsBacklogHealth();
    if (backlog.status === "stale") {
      // Operational alert, with aggregate counts only (no student data).
      console.error("[cron/reconcile-srs] stale backlog:", backlog);
    } else if (backlog.status === "delayed") {
      console.warn("[cron/reconcile-srs] delayed backlog:", backlog);
    }
    const ok = summary.failed === 0 && backlog.status !== "stale";
    return NextResponse.json(
      { ok, ...summary, backlog },
      { status: ok ? 200 : 503 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, reason: "monitoring_unavailable", ...summary },
      { status: 503 },
    );
  }
}
