"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, ChevronRight, Moon, PenLine, RotateCcw, Sparkles } from "lucide-react";
import questoes from "./questoes.json";

type Filtro = "Todas" | "Linguagens" | "Humanas";
type Questao = {
  id: string;
  area: string;
  assunto: string;
  contexto: string;
  enunciado: string;
  alternativas: string[];
  resposta: number;
  explicacao: string;
};

const banco: Questao[] = questoes;
const filtros: Filtro[] = ["Todas", "Linguagens", "Humanas"];
const letras = ["A", "B", "C", "D", "E"];

export default function RevisaoEnemPage() {
  const [filtro, setFiltro] = useState<Filtro>("Todas");
  const [posicao, setPosicao] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, number>>({});

  const lista = banco.filter((questao) => filtro === "Todas" || questao.area === filtro);
  const atual = lista[posicao];
  const escolha = atual ? respostas[atual.id] : undefined;
  const respondidas = lista.filter((q) => respostas[q.id] !== undefined).length;
  const corretas = lista.filter((q) => respostas[q.id] === q.resposta).length;
  const finalizado = posicao >= lista.length;
  const progresso = lista.length ? (respondidas / lista.length) * 100 : 0;

  function mudarFiltro(valor: Filtro) {
    setFiltro(valor);
    setPosicao(0);
  }

  function recomecar() {
    setRespostas({});
    setPosicao(0);
  }

  return (
    <main className="min-h-screen bg-[#090c1b] text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(111,80,216,0.28),transparent_70%)]" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-5xl px-4 pb-20 pt-6 sm:px-6">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Moon className="h-6 w-6 text-violet-300" aria-hidden="true" />
            Study<span className="-ml-2 text-violet-300">Moon</span>
          </Link>
          <Link href="/login" className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-violet-400 hover:text-white">
            Entrar na minha conta
          </Link>
        </header>

        <div className="mb-7 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-violet-300/30 bg-violet-400/10 px-3 py-1 text-xs font-semibold tracking-wide text-violet-200">
            Revisão especial ENEM
          </span>
          <span className="text-xs text-white/55">Sem cadastro • 100% grátis • Funciona no celular</span>
        </div>

        <section className="mb-10">
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">
            Sua revisão começa <span className="text-violet-300">agora.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/65">
            Treine os temas do primeiro dia do ENEM com questões inéditas de Linguagens e Ciências Humanas.
            Responda, descubra por que acertou ou errou e depois pratique sua redação.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
          <section aria-label="Questionário de revisão" className="overflow-hidden rounded-3xl border border-white/10 bg-[#14192d]/95 shadow-2xl shadow-black/20">
            <div className="border-b border-white/10 p-5 sm:p-7">
              <div className="mb-5 flex flex-wrap gap-2">
                {filtros.map((valor) => (
                  <button
                    type="button"
                    key={valor}
                    onClick={() => mudarFiltro(valor)}
                    aria-pressed={filtro === valor}
                    className={"rounded-full px-4 py-2 text-sm font-medium transition " +
                      (filtro === valor
                        ? "bg-violet-400 text-[#090c1b]"
                        : "border border-white/15 text-white/65 hover:border-violet-300/60 hover:text-white")}
                  >
                    {valor === "Todas" ? "Treino misto" : valor}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-4 text-sm text-white/65">
                <span>{finalizado ? "Revisão concluída" : "Questão " + (posicao + 1) + " de " + lista.length}</span>
                <span className="tabular-nums">{respondidas} respondidas • {corretas} acertos</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={respondidas} aria-valuemin={0} aria-valuemax={lista.length} aria-label="Questões respondidas">
                <div className="h-full rounded-full bg-violet-400 transition-all duration-300" style={{ width: progresso + "%" }} />
              </div>
            </div>

            {finalizado ? (
              <div className="p-6 text-center sm:p-10">
                <CheckCircle2 className="mx-auto mb-5 h-12 w-12 text-emerald-300" aria-hidden="true" />
                <h2 className="text-2xl font-bold">Revisão concluída!</h2>
                <p className="mt-3 text-lg font-semibold text-violet-200">{corretas} de {lista.length} acertos</p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/65">
                  Reveja as explicações quando errar e pratique os conceitos que ainda causam dificuldade.
                  Seu resultado deste treino não altera o XP nem o histórico da sua conta.
                </p>
                <button type="button" onClick={recomecar} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-400 px-5 py-3 font-semibold text-[#090c1b] hover:bg-violet-300">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Recomeçar revisão
                </button>
              </div>
            ) : (
              <div className="p-5 sm:p-7">
                <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-violet-400/15 px-3 py-1 font-semibold text-violet-200">{atual.area}</span>
                  <span className="text-white/50">{atual.assunto}</span>
                </div>
                <p className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-7 text-white/80 sm:p-5">{atual.contexto}</p>
                <h2 className="mb-6 mt-6 text-lg font-semibold leading-7 sm:text-xl">{atual.enunciado}</h2>
                <fieldset className="space-y-3" disabled={escolha !== undefined}>
                  <legend className="sr-only">Escolha uma alternativa</legend>
                  {atual.alternativas.map((alternativa, indice) => {
                    const respondida = escolha !== undefined;
                    const certa = indice === atual.resposta;
                    const selecionada = escolha === indice;
                    let estado = "border-white/10 bg-white/[0.035] text-white/85 hover:border-violet-400/70 hover:bg-violet-400/10";
                    if (respondida && certa) estado = "border-emerald-400/70 bg-emerald-400/10 text-emerald-100";
                    else if (respondida && selecionada) estado = "border-rose-400/70 bg-rose-400/10 text-rose-100";
                    else if (respondida) estado = "border-white/10 bg-white/[0.02] text-white/40";
                    return (
                      <button
                        type="button"
                        key={letras[indice]}
                        disabled={respondida}
                        onClick={() => setRespostas((anterior) => ({ ...anterior, [atual.id]: indice }))}
                        aria-pressed={selecionada}
                        className={"flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm leading-relaxed transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 " + estado}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-current/30 font-bold">{letras[indice]}</span>
                        <span className="pt-0.5">{alternativa}</span>
                      </button>
                    );
                  })}
                </fieldset>

                {escolha !== undefined ? (
                  <div aria-live="polite" className="mt-6 rounded-2xl border border-white/10 bg-[#0c1124] p-5">
                    <div className={"mb-2 flex items-center gap-2 font-semibold " + (escolha === atual.resposta ? "text-emerald-300" : "text-amber-300")}>
                      {escolha === atual.resposta ? "Você acertou!" : "Boa tentativa! Veja a explicação."}
                    </div>
                    <p className="text-sm leading-7 text-white/75">{atual.explicacao}</p>
                    <button
                      type="button"
                      onClick={() => setPosicao((n) => n + 1)}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-400 px-5 py-3 font-semibold text-[#090c1b] transition hover:bg-violet-300 sm:w-auto"
                    >
                      {posicao + 1 === lista.length ? "Ver resultado" : "Próxima questão"}
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-white/50">Escolha uma resposta para revelar a explicação. Não há cronômetro.</p>
                )}
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-white/10 bg-[#14192d]/95 p-6">
              <div className="mb-4 flex items-center gap-2 text-violet-200">
                <PenLine className="h-5 w-5" aria-hidden="true" />
                <h2 className="font-semibold">Treino de redação</h2>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Tema sugerido (inédito)</p>
              <p className="mt-2 text-lg font-semibold leading-snug">Desafios para ampliar o acesso à leitura no Brasil</p>
              <p className="mt-3 text-sm leading-relaxed text-white/65">
                Escreva quatro parágrafos: introdução com tese, dois desenvolvimentos com argumentos e conclusão com proposta de intervenção.
              </p>
              <div className="mt-4 rounded-xl bg-violet-400/10 p-4 text-sm leading-6 text-white/75">
                <strong className="block text-violet-200">Na conclusão, confira:</strong>
                agente + ação + meio + finalidade + detalhamento.
              </div>
              <Link href="/redacao" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-200 hover:text-white">
                Abrir redações no StudyMoon <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#14192d]/95 p-6">
              <div className="mb-3 flex items-center gap-2 text-violet-200">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
                <h2 className="font-semibold">Continuar estudando</h2>
              </div>
              <p className="text-sm leading-relaxed text-white/65">
                Esta revisão funciona sem login e não salva XP. Para treinar com as questões do banco, aulas e progresso, entre na plataforma.
              </p>
              <Link href="/estudo/pratica" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-violet-300/40 px-4 py-3 text-sm font-semibold text-violet-200 transition hover:bg-violet-400/10">
                Ir para prática adaptativa <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </section>
          </aside>
        </div>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs leading-relaxed text-white/45">
          <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4" aria-hidden="true" /> Questões autorais de revisão, não oficiais do INEP.</span>
          <span>StudyMoon • Estude no seu ritmo</span>
        </footer>
      </div>
    </main>
  );
}
