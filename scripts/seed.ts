/**
 * Imports/ upserts curriculum, lessons and seed questions into Supabase.
 * Uses DATABASE_URL (direct Postgres) — service-level write, no RLS.
 * Run: pnpm db:seed  (after pnpm db:migrate)
 */
import postgres from "postgres";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  curriculumSchema,
  lessonsFileSchema,
  questionBatchSchema,
} from "@/lib/content/schemas";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set (see docs/SETUP.md).");
    process.exit(1);
  }
  const sql = postgres(databaseUrl, { ssl: "prefer", max: 1 });

  const contentDir = path.join(process.cwd(), "content");

  // ---------- curriculum ----------
  const curriculoRaw = await readFile(
    path.join(contentDir, "curriculo.json"),
    "utf8",
  );
  const curriculo = curriculumSchema.parse(JSON.parse(curriculoRaw));

  // ---------- lessons ----------
  const lessons: Record<string, { estimated_minutes: number; explanation_md: string }> = {};
  for (const file of await readdir(contentDir)) {
    if (file.startsWith("lessons-") && file.endsWith(".json")) {
      const parsed = lessonsFileSchema.parse(
        JSON.parse(await readFile(path.join(contentDir, file), "utf8")),
      );
      Object.assign(lessons, parsed);
    }
  }

  // ---------- questions ----------
  const questions: unknown[] = [];
  const seedsDir = path.join(contentDir, "seeds");
  for (const file of await readdir(seedsDir)) {
    if (file.startsWith("questions-") && file.endsWith(".json")) {
      const parsed = questionBatchSchema.parse(
        JSON.parse(await readFile(path.join(seedsDir, file), "utf8")),
      );
      questions.push(...parsed.questions);
    }
  }

  // ---------- upsert areas ----------
  for (const area of curriculo.areas) {
    await sql`
      insert into areas (slug, name, icon, sort_order)
      values (${area.slug}, ${area.name}, ${area.icon ?? null}, ${area.sort_order})
      on conflict (slug) do update
        set name = excluded.name, icon = excluded.icon, sort_order = excluded.sort_order
    `;
  }
  console.log(`areas: ${curriculo.areas.length} ok`);

  // ---------- upsert topics (discipline rows + topic rows) ----------
  const topicIds = new Map<string, string>();
  let topicCount = 0;
  for (const area of curriculo.areas) {
    const areaRow = await sql`select id from areas where slug = ${area.slug}`;
    const areaId = areaRow[0].id as string;

    for (const discipline of area.disciplines) {
      // discipline = parent topic row
      const discRow = await sql`
        insert into topics (area_id, slug, name, description, level, enem_weight, sort_order)
        values (${areaId}, ${discipline.slug}, ${discipline.name}, null, 1, 0, 0)
        on conflict (slug) do update
          set name = excluded.name, area_id = excluded.area_id
        returning id
      `;
      const disciplineId = discRow[0].id as string;

      let order = 0;
      for (const topic of discipline.topics) {
        const row = await sql`
          insert into topics (area_id, parent_id, slug, name, description, level, enem_weight, matrix_codes, demo_id, sort_order)
          values (${areaId}, ${disciplineId}, ${topic.slug}, ${topic.name}, ${topic.description}, ${topic.level}, ${topic.enem_weight}, ${sql.json(topic.matrix_codes)}, ${topic.demo_id ?? null}, ${order})
          on conflict (slug) do update
            set name = excluded.name, description = excluded.description, level = excluded.level,
                enem_weight = excluded.enem_weight, matrix_codes = excluded.matrix_codes,
                demo_id = excluded.demo_id, area_id = excluded.area_id, parent_id = excluded.parent_id
          returning id
        `;
        topicIds.set(topic.slug, row[0].id as string);
        topicCount += 1;
        order += 1;
      }
    }
  }
  console.log(`topics: ${topicCount} ok`);

  // ---------- upsert lessons ----------
  let lessonCount = 0;
  const missingLesson: string[] = [];
  for (const [slug, lesson] of Object.entries(lessons)) {
    const topicId = topicIds.get(slug);
    if (!topicId) {
      console.warn(`lesson for unknown topic: ${slug}`);
      continue;
    }
    await sql`
      insert into lessons (topic_id, explanation_md, estimated_minutes)
      values (${topicId}, ${lesson.explanation_md}, ${lesson.estimated_minutes})
      on conflict (topic_id) do update
        set explanation_md = excluded.explanation_md,
            estimated_minutes = excluded.estimated_minutes,
            version = lessons.version + 1
    `;
    lessonCount += 1;
  }
  // Topics without a detailed lesson still work: the app falls back to the
  // topic description + practice. The nightly pipeline enriches lessons.
  for (const slug of topicIds.keys()) {
    if (!lessons[slug]) missingLesson.push(slug);
  }
  console.log(`lessons: ${lessonCount} ok (${missingLesson.length} tópicos sem lição detalhada)`);

  // ---------- upsert badges ----------
  const badges = [
    ["primeira-semana", "Primeira Semana Lunar", "Estudou por 7 dias seguidos", "CalendarCheck", 50, 1],
    ["sequencia-30", "Ciclo Completo", "30 dias de sequência", "Flame", 150, 2],
    ["questoes-100", "Centurião", "Respondeu 100 questões", "Target", 100, 3],
    ["teste-perfeito", "Noite Perfeita", "0 erros em um teste de tópico", "Sparkles", 80, 4],
    ["redacao-800", "Escriba Lunar", "Redação com estimativa 800+", "PenLine", 200, 5],
    ["simulado-completo", "Maratonista", "Concluiu um simulado completo", "Timer", 120, 6],
    ["revisor-dedicado", "Guardião da Memória", "50 revisões concluídas", "Brain", 100, 7],
    ["madrugador", "Caçador de Aurora", "Estudou antes das 7h em 5 dias", "Sunrise", 60, 8],
  ] as const;
  for (const [slug, name, description, icon, xp, order] of badges) {
    await sql`
      insert into badges (slug, name, description, icon, xp_reward, sort_order)
      values (${slug}, ${name}, ${description}, ${icon}, ${xp}, ${order})
      on conflict (slug) do update
        set name = excluded.name, description = excluded.description,
            icon = excluded.icon, xp_reward = excluded.xp_reward, sort_order = excluded.sort_order
    `;
  }
  console.log("badges: 8 ok");

  // ---------- upsert essay themes (original, ENEM-style) ----------
  const themes = [
    {
      title: "Desafios do enfrentamento da desinformação no Brasil",
      kind: "tecnologia",
      texts: [
        {
          source: "Relatório institucional sobre estado da rede",
          text: "A circulação de informações falsas tornou-se um dos principais desafios da comunicação digital: ao ritmo de um toque, conteúdos verificáveis e mentiras chegam juntos a milhões de pessoas, e a velocidade de compartilhamento supera a da checagem.",
        },
        {
          source: "Dados de pesquisa sobre comportamento digital",
          text: "Estudos indicam que grande parte dos jovens brasileiros recebe notícias principalmente por redes sociais e aplicativos de mensagem, ambientes em que a origem da informação frequentemente não é verificada antes do compartilhamento.",
        },
      ],
    },
    {
      title: "Persistência da violência contra a mulher e caminhos de enfrentamento no Brasil",
      kind: "direitos",
      texts: [
        {
          source: "Anuário brasileiro de segurança pública",
          text: "Os registros oficiais mostram que a violência doméstica e o feminicídio permanecem em patamares alarmantes no país, apesar dos marcos legais conquistados nas últimas décadas.",
        },
        {
          source: "Reportagem sobre redes de apoio",
          text: "Casas de acolhimento, delegacias especializadas e programas de renda têm sido apontados como estratégias eficazes quando combinados a políticas educativas que enfrentam a desigualdade de gênero desde a escola.",
        },
      ],
    },
    {
      title: "Segurança hídrica e os desafios da gestão da água no Brasil",
      kind: "meio ambiente",
      texts: [
        {
          source: "Agência nacional de águas",
          text: "O Brasil concentra parcela significativa da água doce do planeta, mas enfrenta crises de abastecimento: perdas nas redes, desperdício no consumo e disputas por usos múltiplos comprometem a segurança hídrica de regiões inteiras.",
        },
        {
          source: "Nota técnica sobre consumo",
          text: "Boa parte da água consumida no país destina-se à agricultura e à geração de energia, o que exige decisões integradas entre economia, meio ambiente e justiça social.",
        },
      ],
    },
    {
      title: "Saúde mental na escola: desafios do acolhimento de jovens",
      kind: "saude",
      texts: [
        {
          source: "Organização mundial da saúde",
          text: "Transtornos mentais comuns, como ansiedade e depressão, têm início frequente na adolescência, e o ambiente escolar pode ser tanto fator de risco quanto espaço de proteção.",
        },
        {
          source: "Política nacional de saúde do estudante",
          text: "Programas de promoção da saúde nas escolas prevêem ações de prevenção e acolhimento, mas a implementação esbarra na formação limitada de professores e na carência de redes de atendimento.",
        },
      ],
    },
    {
      title: "Obesidade infantil e a promoção da alimentação saudável no Brasil",
      kind: "saude",
      texts: [
        {
          source: "Sistema de vigilância alimentar",
          text: "O excesso de peso atinge parcela crescente das crianças brasileiras, associado à substituição da comida caseira por ultraprocessados e à redução da atividade física.",
        },
        {
          source: "Marco legal de alimentação escolar",
          text: "A legislação exige o oferecimento de alimentação adequada nas escolas e restringe a venda de produtos ultraprocessados no ambiente escolar — o desafio está em fiscalizar e educar para além da lei.",
        },
      ],
    },
    {
      title: "Acesso à cultura como ferramenta de cidadania no Brasil",
      kind: "sociedade",
      texts: [
        {
          source: "Sistema nacional de indicadores culturais",
          text: "O acesso a bens e serviços culturais — livros, cinemas, teatro, internet qualificada — permanece desigual entre regiões e classes sociais do país.",
        },
        {
          source: "Constituição Federal, art. 215",
          text: "O Estado garantirá a todos o pleno exercício dos direitos culturais e o acesso às fontes da cultura nacional.",
        },
      ],
    },
  ] as const;

  for (const theme of themes) {
    await sql`
      insert into essay_themes (title, texts_motivadores, kind, status)
      values (${theme.title}, ${sql.json(theme.texts)}, ${theme.kind}, 'validated')
      on conflict do nothing
    `;
  }
  console.log(`essay themes: ${themes.length} ok`);

  // ---------- upsert questions ----------
  let qOk = 0;
  const qErrors: string[] = [];
  for (const raw of questions) {
    const q = raw as {
      topic_slug: string;
      difficulty: number;
      context_md: string | null;
      statement_md: string;
      alternatives: Array<{ key: string; text: string }>;
      answer_key: string;
      explanation_md: string;
      hints: string[];
      subtopic?: string | null;
      demo_params?: Record<string, string | number | boolean> | null;
      demo_id: string | null;
      source: string;
      license?: string;
      origin: string;
      numeric_check?: { expression: string; result: string } | null;
    };
    const topicId = topicIds.get(q.topic_slug);
    if (!topicId) {
      qErrors.push(`unknown topic: ${q.topic_slug}`);
      continue;
    }
    await sql`
      insert into questions (topic_id, difficulty, context_md, statement_md, alternatives, answer_key, explanation_md, hints, subtopic, demo_params, demo_id, status, source, license, origin, numeric_check, numeric_expr)
      values (
        ${topicId}, ${q.difficulty}, ${q.context_md ?? null}, ${q.statement_md},
        ${sql.json(q.alternatives)}, ${q.answer_key}, ${q.explanation_md},
        ${sql.json(q.hints)}, ${q.subtopic ?? null},
        ${q.demo_params ? sql.json(q.demo_params) : null},
        ${q.demo_id ?? null}, 'validated',
        ${q.source}, ${q.license ?? "Conteúdo original StudyMoon (CC BY-SA)"}, ${q.origin},
        ${q.numeric_check ? true : false},
        ${q.numeric_check ? sql.json(q.numeric_check) : null}
      )
    `;
    qOk += 1;
  }
  console.log(`questions: ${qOk} ok`);
  if (qErrors.length) {
    console.error("question errors:", qErrors);
  }

  // ---------- summary ----------
  const [{ count: totalQuestions }] = await sql`select count(*)::int as count from questions`;
  const [{ count: validatedQuestions }] =
    await sql`select count(*)::int as count from questions where status = 'validated'`;
  console.log(`\nBanco: ${totalQuestions} questões (${validatedQuestions} validadas).`);
  console.log(`Cobertura inicial: ${(validatedQuestions / Math.max(1, topicCount)).toFixed(1)} questões/tópico.`);
  console.log("O pipeline noturno (content-nightly) expande a cobertura automaticamente.");

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
