import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { getSupabaseAdmin } from "@/lib/db/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface PushMessage {
  title: string;
  body: string;
}

/** Gentle escalation messages (varied, short — doc section 10). */
const MESSAGES: Record<Kind, PushMessage[]> = {
  reminder: [
    { title: "StudyMoon", body: "Chegou sua hora de estudar. 10 minutos já mantêm a sequência." },
    { title: "StudyMoon", body: "A lua subiu — que tal uma questão agora?" },
    { title: "StudyMoon", body: "Seu plano de hoje tem espaço para você." },
  ],
  escalation: [
    { title: "StudyMoon", body: "Ainda dá tempo: 10 minutos e a sequência está salva." },
    { title: "StudyMoon", body: "Faltam só algumas questões para a meta de hoje." },
  ],
  streak_risk: [
    { title: "StudyMoon", body: "Sua sequência corre risco hoje — 10 minutos resolvem." },
    { title: "StudyMoon", body: "Não deixe a lua apagar: uma sessão curta salva o dia." },
  ],
  return: [
    { title: "StudyMoon", body: "A lua sentiu sua falta. Recomece leve: 10 minutos hoje." },
    { title: "StudyMoon", body: "Seu plano foi recalculado — dá para retomar aos poucos." },
  ],
};

type Kind = keyof typeof MESSAGES;

const MAX_PER_DAY = 2;
const QUIET_START = 22; // 22h
const QUIET_END = 7; // 7h

interface LocalTime {
  hour: number;
  minute: number;
  date: string;
}

function localTimeIn(timezone: string): LocalTime {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return {
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
    date: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Reminder scheduler (doc section 10): called every 15 min by GitHub Actions.
 * Rules: user's preferred time (±14 min window) → +2h escalation if no study
 * → evening streak-risk → after 2 days away, a welcome-back message.
 * Never during quiet hours (22h-7h), max 2/day (notification_log).
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
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "vapid_not_configured" }, { status: 503 });
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:contact@studymoon.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );

  // Candidates: push-enabled users with subscriptions.
  const { data: users } = await admin
    .from("profiles")
    .select("id, apelido, timezone, preferred_study_time, notify_push")
    .eq("notify_push", true);
  if (!users || users.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth_key");
  const subsByUser = new Map<string, Array<{ id: string; endpoint: string; p256dh: string; auth_key: string }>>();
  for (const sub of subscriptions ?? []) {
    const list = subsByUser.get(sub.user_id) ?? [];
    list.push(sub);
    subsByUser.set(sub.user_id, list);
  }

  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    const subs = subsByUser.get(user.id);
    if (!subs || subs.length === 0) continue;

    const local = localTimeIn(user.timezone || "America/Sao_Paulo");

    // Quiet hours.
    if (local.hour >= QUIET_START || local.hour < QUIET_END) {
      skipped += 1;
      continue;
    }

    // Today's notifications for this user.
    const { data: todayLogs } = await admin
      .from("notification_log")
      .select("kind, sent_at")
      .eq("user_id", user.id)
      .gte("sent_at", `${local.date}T00:00:00`);
    const logs = todayLogs ?? [];
    if (logs.length >= MAX_PER_DAY) {
      skipped += 1;
      continue;
    }

    // Studied today? (attempts in the user's local date window)
    const { count: todayAttempts } = await admin
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", `${local.date}T00:00:00`);
    const studiedToday = (todayAttempts ?? 0) > 0;

    // Days since last study.
    const { data: streak } = await admin
      .from("streaks")
      .select("current, last_study_date")
      .eq("user_id", user.id)
      .single();

    const preferred = (user.preferred_study_time ?? "19:00").slice(0, 5);
    const [prefH, prefM] = preferred.split(":").map(Number);
    const nowMinutes = local.hour * 60 + local.minute;
    const prefMinutes = prefH * 60 + prefM;
    const alreadyReminded = logs.some((l) => l.kind === "reminder" || l.kind === "escalation");

    let kind: Kind | null = null;
    if (!studiedToday) {
      const daysAway = daysBetween(streak?.last_study_date ?? null, local.date);
      if (daysAway >= 2) {
        kind = "return";
      } else if (
        Math.abs(nowMinutes - prefMinutes) <= 14 &&
        nowMinutes >= prefMinutes
      ) {
        kind = "reminder";
      } else if (
        alreadyReminded &&
        nowMinutes >= prefMinutes + 120 &&
        nowMinutes < prefMinutes + 135
      ) {
        kind = "escalation";
      } else if (
        local.hour >= 19 &&
        local.hour < 22 &&
        (streak?.current ?? 0) > 0 &&
        logs.every((l) => l.kind !== "streak_risk")
      ) {
        kind = "streak_risk";
      }
    }

    if (!kind) continue;

    const message = pick(MESSAGES[kind]);
    let delivered = false;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          JSON.stringify({ ...message, url: "/painel" }),
        );
        delivered = true;
        await admin
          .from("push_subscriptions")
          .update({ last_success_at: new Date().toISOString(), failures: 0 })
          .eq("id", sub.id);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // Subscription expired: remove it.
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.warn(
            "[cron/reminders] push failed:",
            sub.endpoint.slice(0, 60),
            status ?? "",
          );
        }
      }
    }

    if (delivered) {
      await admin.from("notification_log").insert({
        user_id: user.id,
        kind,
        channel: "push",
        payload: message,
        result: "sent",
      });
      sent += 1;
    }
  }

  return NextResponse.json({ ok: true, sent, skipped });
}

function daysBetween(lastDate: string | null, todayDate: string): number {
  if (!lastDate) return 999;
  const diff =
    new Date(todayDate + "T00:00:00Z").getTime() -
    new Date(lastDate + "T00:00:00Z").getTime();
  return Math.round(diff / 86400000);
}
