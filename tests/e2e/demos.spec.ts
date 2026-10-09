import { expect, test } from "@playwright/test";

/**
 * PASSO 5 — Testes E2E de regressão da auditoria de simuladores.
 *
 *  1. Nenhuma questão exibe demo de subtópico diferente (nível subtópico).
 *  2. Demo de área X nunca aparece em questão de área Y.
 *  3. Invariantes numéricos na interface: escala-mapa com os números da
 *     questão (4,5 cm @ 1:200.000 ⇒ 9 km) e alavanca horizontal quando
 *     3 kg × 4 m = 6 kg × 2 m (regressão do bug B).
 *  4. Fluxo real de questão por subtópico: responder errado ⇒ o simulador
 *     exibido é o esperado do subtópico.
 *  5. Snapshot visual de cada simulador (estados padrão e extremo).
 *  6. Sem rolagem lateral em viewport de 360 px.
 *
 * A galeria /demos renderiza as MESMAS seeds e o MESMO resolvedor de
 * produção; o mapa esperado abaixo é a fonte de verdade do teste.
 */

/** Vínculo esperado subtópico → demo (espelho do catálogo, hardcode de propósito). */
const EXPECTED_SUBTOPIC_DEMO: Record<string, string | null> = {
  // matemática
  "mt-porcentagem-juros.porcentagem": "porcentagem",
  "mt-porcentagem-juros.variacoes-sucessivas": "porcentagem",
  "mt-porcentagem-juros.juros-simples": null,
  "mt-porcentagem-juros.juros-compostos": "porcentagem",
  "mt-fracoes-decimais.fracoes": "fracoes",
  "mt-razao-proporcao.razao": "razao",
  "mt-razao-proporcao.proporcao": "razao",
  "mt-razao-proporcao.regra-de-tres-direta": "regra-de-tres",
  "mt-razao-proporcao.regra-de-tres-inversa": "regra-de-tres",
  "mt-razao-proporcao.escala": "escala-mapa",
  "mt-funcoes.afim": "funcoes",
  "mt-funcoes.quadratica": "funcoes",
  "mt-funcoes.exponencial": null,
  "mt-estatistica.media-mediana-moda": "estatistica",
  "mt-estatistica.leitura-dados": null,
  "mt-probabilidade.probabilidade-simples": null,
  "mt-probabilidade.eventos-compostos": "probabilidade",
  "mt-combinatoria.principio-multiplicativo": null,
  "mt-geometria-plana.areas-perimetros": "geometria",
  "mt-geometria-plana.pitagoras": null,
  "mt-trigonometria.triangulos-retangulos": null,
  "mt-sequencias.progressoes": null,
  // natureza
  "cn-genetica.cruzamentos": "genetica",
  "cn-genetica.sistema-abo": null,
  "cn-estequiometria.calculos-estequiometricos": "balanceamento",
  "cn-eletricidade.potencia-eletrica": "phet",
  "cn-ecologia.eutrofizacao": "eutrofizacao",
  "cn-fisiologia.homeostase": null,
  // humanas
  "ch-meio-ambiente.mudancas-climaticas": null,
  "ch-brasil-republica.era-vargas": null,
  // linguagens
  "lc-interpretacao.interpretacao": "textos",
  "lc-variacao-linguistica.registro": null,
};

/** Área esperada de cada demo (prefixo do tópico dos seus subtópicos). */
const EXPECTED_DEMO_AREA: Record<string, string> = {
  porcentagem: "mt",
  fracoes: "mt",
  razao: "mt",
  "regra-de-tres": "mt",
  "escala-mapa": "mt",
  funcoes: "mt",
  estatistica: "mt",
  probabilidade: "mt",
  geometria: "mt",
  divisao: "mt",
  genetica: "cn",
  balanceamento: "cn",
  phet: "cn",
  eutrofizacao: "cn",
  alavanca: "cn",
  textos: "lc",
  "linha-tempo": "lc",
  mapas: "ch",
};

const GALLERY = "/demos";

test.describe("Galeria /demos — auditoria de simuladores", () => {
  test("toda questão exibe exatamente a demo do PRÓPRIO subtópico (nível subtópico)", async ({ page }) => {
    await page.goto(GALLERY);
    const rows = page.locator("[data-resolution-row]");
    await expect(rows).not.toHaveCount(0);

    const count = await rows.count();
    const seen = new Set<string>();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const topic = await row.getAttribute("data-topic");
      const subtopic = await row.getAttribute("data-subtopic");
      const demo = (await row.getAttribute("data-demo")) ?? "";
      expect(topic, "questão sem tópico").toBeTruthy();

      // questão SEM subtópico ⇒ NENHUMA demo (regra: nada é melhor que demo errada)
      if (!subtopic) {
        expect(demo, `${topic}: questão sem subtópico exibiu "${demo}"`).toBe("");
        continue;
      }

      const key = `${topic}.${subtopic}`;
      seen.add(key);
      const expected = EXPECTED_SUBTOPIC_DEMO[key];
      expect(
        expected !== undefined,
        `subtópico desconhecido no mapa do teste: "${key}" — atualize EXPECTED_SUBTOPIC_DEMO`,
      ).toBe(true);
      expect(
        demo,
        `questão de "${key}" exibiu "${demo}", mas o subtópico dela exige "${expected ?? "nenhuma demo"}" — é exatamente o bug da demo desligada do assunto`,
      ).toBe(expected ?? "");
    }

    // todas as questões com subtópico com demo foram cobertas acima; entradas
    // do mapa sem seed (ex.: razao/proporcao — demo só na lição) são legítimas.
  });

  test("demo de área X nunca aparece em questão de área Y", async ({ page }) => {
    await page.goto(GALLERY);
    const rows = page.locator("[data-resolution-row]");
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const topic = (await row.getAttribute("data-topic")) ?? "";
      const demo = (await row.getAttribute("data-demo")) ?? "";
      if (!demo) continue;
      const questionArea = topic.split("-")[0];
      const demoArea = EXPECTED_DEMO_AREA[demo];
      expect(
        demoArea !== undefined,
        `demo "${demo}" sem área esperada no mapa do teste`,
      ).toBe(true);
      expect(
        questionArea === demoArea,
        `demo "${demo}" (área ${demoArea}) apareceu em questão da área ${questionArea} (${topic})`,
      ).toBe(true);
    }
  });

  test("sem rolagem lateral em viewport de 360 px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(GALLERY);
    // aguarda a primeira demo carregar (as demais são lazy)
    await page.waitForSelector('[data-loaded="1"]', { timeout: 20_000 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth, `scrollWidth ${scrollWidth} > 360 — há rolagem lateral`).toBeLessThanOrEqual(360);
  });

  test("escala-mapa com os números da questão: 4,5 cm em 1:200.000 ⇒ 9 km", async ({ page }) => {
    await page.goto(GALLERY);
    const frame = page.locator('[data-demo-frame="escala-mapa"][data-state="standard"]');
    await expect(frame.locator('[data-loaded="1"]')).toBeVisible({ timeout: 20_000 });

    // passo a passo com os números exatos da questão
    await expect(frame.getByText(/4,5 × 200\.000 = 900\.000 cm/)).toBeVisible();
    await expect(frame.getByText(/900\.000 ÷ 100\.000 = 9 km/)).toBeVisible();
    await expect(frame.getByText(/correspondem a 9 km reais/)).toBeVisible({ timeout: 10_000 });
  });

  test("alavanca: 3 kg × 4 m = 6 kg × 2 m ⇒ barra HORIZONTAL (regressão do bug B)", async ({ page }) => {
    await page.goto(GALLERY);
    const frame = page.locator('[data-demo-frame="alavanca"][data-state="standard"]');
    await expect(frame.locator('[data-loaded="1"]')).toBeVisible({ timeout: 20_000 });

    // estado padrão é exatamente o caso da auditoria: 3×4 vs 6×2
    await expect(frame.getByText(/12 kg·m/).first()).toBeVisible();
    await expect(frame.getByText(/Equilíbrio! Torques iguais \(12 kg·m de cada lado\) — a barra fica horizontal/)).toBeVisible();

    // desequilibrar pelos controles: massa direita no máximo (teclado no thumb)
    const massaDireita = frame.locator('[role="slider"]').nth(2); // massa-e, dist-e, massa-d
    await massaDireita.focus();
    await page.keyboard.press("End"); // 12 kg
    await expect(frame.getByText(/Desequilíbrio/)).toBeVisible({ timeout: 10_000 });
    await expect(frame.getByText(/12 kg × 2 m = 24 kg·m/).first()).toBeVisible();
  });

  test("fluxo de questão por subtópico: responder errado exibe o simulador esperado", async ({ page }) => {
    await page.goto(GALLERY);
    const fixtures = page.locator("[data-question-fixture]");
    await expect(fixtures).not.toHaveCount(0);
    const count = await fixtures.count();

    for (let i = 0; i < count; i++) {
      const fixture = fixtures.nth(i);
      const subtopic = (await fixture.getAttribute("data-subtopic")) ?? "";
      const key = Object.keys(EXPECTED_SUBTOPIC_DEMO).find((k) => k.endsWith(`.${subtopic}`)) ?? "";
      const expectedDemo = EXPECTED_SUBTOPIC_DEMO[key];
      expect(expectedDemo, `subtópico "${subtopic}" sem entrada no mapa do teste`).toBeDefined();
      if (!expectedDemo) continue;

      const answerKey = (await fixture.getAttribute("data-answerkey")) as string;
      const wrongIndex = ["A", "B", "C", "D", "E"].findIndex((k) => k !== answerKey);

      await fixture.scrollIntoViewIfNeeded();
      await fixture.locator("fieldset button").nth(wrongIndex).click();
      await fixture.getByRole("button", { name: /Responder/ }).click();

      const section = fixture.locator("text=Veja o conceito em movimento");
      await expect(section).toBeVisible({ timeout: 15_000 });
      const demoFrame = fixture.locator('[data-demo-id][data-loaded="1"]');
      await expect(demoFrame).toBeVisible({ timeout: 15_000 });
      await expect(
        demoFrame,
        `subtópico "${subtopic}" deveria exibir "${expectedDemo}"`,
      ).toHaveAttribute("data-demo-id", expectedDemo);
    }
  });

  test("phet abre na aba correta pelo parâmetro do subtópico (circuits)", async ({ page }) => {
    await page.goto(GALLERY);
    const frame = page.locator('[data-demo-frame="phet"][data-state="standard"]'); // params: circuits
    await expect(frame.locator('[data-loaded="1"]')).toBeVisible({ timeout: 20_000 });
    const selected = frame.locator('[role="tab"][aria-selected="true"]');
    await expect(selected).toHaveText(/Circuitos elétricos/);
  });
});

test.describe("Snapshots visuais dos simuladores (padrão e extremo)", () => {
  test.use({ reducedMotion: "reduce" });

  // Baselines são por navegador/plataforma; o projeto mobile (Pixel 7) usa o
  // mesmo sufixo chromium-linux com viewport diferente — snapshot só no desktop.
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "snapshot apenas no projeto chromium");
  });

  // phet embeds iframe externo — sem snapshot visual (flaky); a cobertura
  // estrutural dele (aba inicial por parâmetro) está nos testes acima.
  for (const demoId of [
    "porcentagem",
    "fracoes",
    "funcoes",
    "divisao",
    "razao",
    "regra-de-tres",
    "escala-mapa",
    "probabilidade",
    "estatistica",
    "genetica",
    "eutrofizacao",
    "balanceamento",
    "alavanca",
    "textos",
    "linha-tempo",
    "geometria",
    "mapas",
  ]) {
    test(`${demoId} — estado padrão`, async ({ page }) => {
      await page.goto(GALLERY);
      const frame = page.locator(`[data-demo-frame="${demoId}"][data-state="standard"]`);
      await expect(frame.locator('[data-loaded="1"]')).toBeVisible({ timeout: 30_000 });
      await expect(frame).toHaveScreenshot(`${demoId}-padrao.png`, {
        maxDiffPixelRatio: 0.02,
        animations: "disabled",
      });
    });
  }

  // estado extremo existe apenas onde a demo aceita parâmetros
  test("escala-mapa — estado extremo", async ({ page }) => {
    await page.goto(GALLERY);
    const frame = page.locator('[data-demo-frame="escala-mapa"][data-state="extreme"]');
    await expect(frame.locator('[data-loaded="1"]')).toBeVisible({ timeout: 30_000 });
    await expect(frame).toHaveScreenshot("escala-mapa-extremo.png", {
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    });
  });
});
