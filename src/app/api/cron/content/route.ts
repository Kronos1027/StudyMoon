import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/admin";
import { generateBatchForTopic, selectTopicsForGeneration } from "@/lib/content/generate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Nightly content generation batch (doc section 8). Protected by CRON_SECRET
 * (GitHub Actions calls this every night). One invocation = one small batch
 * (keeps serverless execution short); the workflow repeats calls.
 */
export async function POST(request: NextRequest) {
  const secret =
    request.headers.get("authorization")?.replace("Bearer ", "") ??
    request.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const topicsPerRun = Number(url.searchParams.get("topics") ?? "2");
  const perTopic = Number(url.searchParams.get("perTopic") ?? "5");

  const targets = await selectTopicsForGeneration(
    Math.min(5, Math.max(1, topicsPerRun)),
    30,
  );
  if (targets.length === 0) {
    return NextResponse.json({ ok: true, message: "banco já na meta de cobertura" });
  }

  const results = [];
  for (const target of targets) {
    try {
      const stats = await generateBatchForTopic(
        target.topic_id,
        Math.min(10, Math.max(1, perTopic)),
      );
      results.push(stats);
    } catch (err) {
      results.push({
        topic: target.topic_id,
        error: (err as Error).message,
      });
    }
  }

  return NextResponse.json({ ok: true, batches: results });
}
