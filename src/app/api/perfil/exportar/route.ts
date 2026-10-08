import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/server";

export const dynamic = "force-dynamic";

/**
 * LGPD data export (doc section 14): returns every personal row the user
 * owns as a single JSON file download.
 */
export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tables = [
    "profiles",
    "attempts",
    "topic_mastery",
    "srs_cards",
    "study_sessions",
    "daily_goals",
    "streaks",
    "xp_events",
    "user_badges",
    "essays",
    "mock_exams",
    "mock_exam_items",
    "push_subscriptions",
    "notification_log",
    "question_reports",
  ] as const;

  const exportable: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    studymoon_user_id: user.id,
    studymoon_email: user.email ?? null,
  };

  const columnByTable: Record<string, string> = {
    profiles: "id",
    streaks: "user_id",
    user_badges: "user_id",
  };

  for (const table of tables) {
    const column = columnByTable[table] ?? "user_id";
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq(column, user.id)
      .limit(5000);
    if (error) {
      console.error(`[export] ${table}: ${error.message}`);
      exportable[table] = { error: "falha ao exportar esta tabela" };
      continue;
    }
    exportable[table] = data;
  }

  const filename = `studymoon-meus-dados-${new Date().toISOString().split("T")[0]}.json`;
  return new NextResponse(JSON.stringify(exportable, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
