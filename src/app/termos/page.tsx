import Link from "next/link";
import type { Metadata } from "next";
import { MoonLogo } from "@/components/brand/moon-logo";

export const metadata: Metadata = { title: "Termos de uso" };

export default function TermosPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <MoonLogo className="h-12 w-12" />
        <h1 className="text-2xl font-semibold">Termos de uso</h1>
        <p className="text-sm text-muted-foreground">
          StudyMoon — plataforma gratuita de preparação para o ENEM
        </p>
      </div>

      <div className="space-y-6 leading-relaxed">
        <section>
          <h2 className="mb-2 text-lg font-semibold">1. O que é o StudyMoon</h2>
          <p className="text-foreground/90">
            O StudyMoon é uma plataforma gratuita, sem anúncios e sem fins
            comerciais, que ajuda estudantes a se preparar para o ENEM com
            aulas, prática adaptativa, revisão inteligente, simulados e
            correção de redação com apoio de inteligência artificial. Ao criar
            uma conta, você concorda com estes termos.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">2. Conta e idade mínima</h2>
          <p className="text-foreground/90">
            Você precisa fornecer um e-mail válido e uma senha. Se você tem
            menos de 18 anos, pedimos que um responsável leia estes termos
            junto com você: por padrão, seu perfil permanece privado e o
            ranking exibe apenas o seu apelido, nunca seu e-mail ou dados de
            contato.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">3. Conteúdo gerado por IA</h2>
          <p className="text-foreground/90">
            Parte das questões, explicações e correções é produzida com apoio
            de inteligência artificial e passa por validação antes de
            circular. Mesmo assim,{" "}
            <strong>conteúdo gerado por IA pode conter erros</strong>. O
            StudyMoon não substitui os materiais oficiais do INEP — sempre
            confira provas, editais e gabaritos oficiais. Encontrou um erro?
            Use o botão “reportar” em qualquer questão: sua ajuda melhora o
            banco para todo mundo.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">4. Uso aceitável</h2>
          <ul className="list-disc space-y-1 pl-5 text-foreground/90">
            <li>Não tente burlar os mecanismos de pontuação (XP, sequência).</li>
            <li>Não compartilhe sua conta nem acesse dados de outros alunos.</li>
            <li>Não use a plataforma para publicar conteúdo ofensivo ou ilegal.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">5. Licenças do conteúdo</h2>
          <p className="text-foreground/90">
            O conteúdo original do StudyMoon é disponibilizado em licença
            aberta (CC BY-SA). Fontes oficiais (provas e matriz do INEP) são
            públicas; materiais de terceiros aparecem apenas por link/ embed
            oficial, com fonte e licença registradas em{" "}
            <Link href="/termos" className="text-accent-1-ink hover:underline">
              atribuição
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">6. Disponibilidade</h2>
          <p className="text-foreground/90">
            O serviço é oferecido “como está”, em infraestrutura de planos
            gratuitos, e pode sofrer manutenções e indisponibilidades. Não
            garantimos nota no exame — garantimos um bom plano de estudos.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">7. Privacidade</h2>
          <p className="text-foreground/90">
            Coletamos o mínimo descrito na{" "}
            <Link href="/privacidade" className="text-accent-1-ink hover:underline">
              política de privacidade
            </Link>
            . Você pode exportar ou apagar seus dados a qualquer momento no seu
            perfil.
          </p>
        </section>
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Última atualização: outubro de 2026
      </p>
    </main>
  );
}
