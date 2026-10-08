/**
 * Validates every video in content/videos.json against YouTube's oEmbed
 * endpoint (no API key needed) and removes broken entries from the local
 * file. Run: pnpm check-videos
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

interface VideoEntry {
  id: string;
  title: string;
  channel: string;
}

interface VideosFile {
  version: number;
  updated: string;
  note?: string;
  topics: Record<string, VideoEntry[]>;
}

async function isVideoValid(videoId: string): Promise<boolean> {
  const url = `https://www.youtube.com/oembed?url=https%3A//www.youtube.com/watch%3Fv%3D${videoId}&format=json`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "StudyMoon-VideoChecker/1.0" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const file = path.join(process.cwd(), "content", "videos.json");
  const data = JSON.parse(await readFile(file, "utf8")) as VideosFile;

  const topics = Object.keys(data.topics);
  if (topics.length === 0) {
    console.log("Nenhum vídeo cadastrado ainda — nada para validar.");
    return;
  }

  let checked = 0;
  let removed = 0;
  for (const topic of topics) {
    const kept: VideoEntry[] = [];
    for (const video of data.topics[topic]) {
      checked += 1;
      if (await isVideoValid(video.id)) {
        kept.push(video);
        console.log(`ok      ${topic} -> ${video.id} (${video.title})`);
      } else {
        removed += 1;
        console.warn(`REMOVIDO ${topic} -> ${video.id} (oEmbed falhou)`);
      }
    }
    if (kept.length === 0) delete data.topics[topic];
    else data.topics[topic] = kept;
  }

  data.updated = new Date().toISOString().split("T")[0];
  await writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`\nVerificados: ${checked}. Removidos: ${removed}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
