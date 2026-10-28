import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nova redação" };

/**
 * Legacy URL compatibility. Never create a database row in a GET render:
 * refreshes, crawlers and Next prefetching must not create empty essays.
 * The explicit mode selection performs the authenticated Server Action.
 */
export default async function NovaRedacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ tema?: string; modo?: string }>;
}) {
  const { tema } = await searchParams;
  if (!tema) redirect("/redacao");
  redirect(`/redacao/escrever?tema=${encodeURIComponent(tema)}`);
}
