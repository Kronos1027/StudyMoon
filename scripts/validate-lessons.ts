// Valida lessons-*.json contra o lessonsFileSchema (Zod) —bun resolve "@/lib"
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { lessonsFileSchema } from "@/lib/content/schemas";

const contentDir = path.join(process.cwd(), "content");
let total = 0;
for (const file of await readdir(contentDir)) {
  if (file.startsWith("lessons-") && file.endsWith(".json")) {
    const parsed = lessonsFileSchema.parse(
      JSON.parse(await readFile(path.join(contentDir, file), "utf8")),
    );
    const keys = Object.keys(parsed);
    total += keys.length;
    console.log(`OK ${file}: ${keys.length} lições`);
  }
}
console.log(`Total: ${total} lições válidas pelo Zod.`);

// conferir o trecho que foi corrigido
const areas = lessonsFileSchema.parse(
  JSON.parse(await readFile(path.join(contentDir, "lessons-areas.json"), "utf8")),
) as Record<string, { explanation_md: string }>;
for (const [id, lesson] of Object.entries(areas)) {
  if (typeof lesson.explanation_md === "string" && lesson.explanation_md.includes("ZERA)")) {
    const i = lesson.explanation_md.indexOf("ZERA)");
    console.log(`\nTrecho corrigido (lição ${id}):`);
    console.log(lesson.explanation_md.slice(i - 90, i + 120));
  }
}
