import Link from "next/link";
import type { Metadata } from "next";
import { MoonLogo } from "@/components/brand/moon-logo";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <MoonLogo className="h-12 w-12" />
        <h1 className="text-2xl font-semibold">Política de privacidade</h1>
        <p className="text-sm text-muted-foreground">
          Em conformidade com a LGPD (Lei 13.709/2018)
        </p>
      </div>

      <div className="space-y-6 leading-relaxed">
        <section>
          <h2 className="mb-2 text-lg font-semibold">O que coletamos (só o necessário)</h2>
          <ul className="list-disc space-y-1 pl-5 text-foreground/90">
            <li>
              <strong>Conta</strong>: e-mail, senha (criptografada pelo
              Supabase Auth) e apelido. Se você entrar com o Google, apenas o
              e-mail e o nome vêm do provedor.
            </li>
            <li>
              <strong>Perfil de estudo</strong>: data de nascimento (para
              proteger menores), data-alvo da prova, horas por dia, horário
              preferido e meta de nota.
            </li>
            <li>
              <strong>Dados de uso</strong>: questões respondidas, tempos,
              acertos, revisões, XP e sequência — usados para personalizar seu
              plano.
            </li>
            <li>
              <strong>Redações</strong>: o texto que você escreve, para
              correção e histórico.
            </li>
            <li>
              <strong>Notificações</strong>: a inscrição do seu navegador
              (endpoint de push) para enviar os lembretes que você autorizou.
            </li>
          </ul>
          <p className="mt-2 text-foreground/90">
            Não coletamos: CPF, endereço, telefone, dados de navegação em
            outros sites. Não usamos rastreadores de terceiros, cookies de
            publicidade ouanalytics externos — e nunca vendemos dados.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Para que usamos</h2>
          <ul className="list-disc space-y-1 pl-5 text-foreground/90">
            <li>Autenticar seu acesso e proteger sua conta;</li>
            <li>Personalizar questões, revisões e o plano de estudos;</li>
            <li>Corrigir redações quando você pedir;</li>
            <li>Enviar os lembretes e resumos que você ativar (e só esses);</li>
            <li>Montar os rankings semanais — apenas com o seu apelido.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Menores de 18 anos</h2>
          <p className="text-foreground/90">
            Sabemos que a maioria dos alunos do ENEM é menor de idade. Por
            isso: perfil privado por padrão, ranking apenas com apelido,
            nenhum dado de contato público, e aviso de consentimento dos
            responsáveis nos{" "}
            <Link href="/termos" className="text-accent-1-ink hover:underline">
              termos de uso
            </Link>
            . Os dados de estudo servem exclusivamente à aprendizagem do
            próprio aluno.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Onde ficam e por quanto tempo</h2>
          <p className="text-foreground/90">
            Os dados ficam em banco gerenciado pelo Supabase (com criptografia
            em trânsito e políticas de acesso por linha — RLS) e permanecem
            enquanto sua conta existir. Ao apagar a conta, tudo é removido em
            cascata: perfil, tentativas, redações, notificações e progresso.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Seus direitos (LGPD)</h2>
          <p className="text-foreground/90">
            A qualquer momento, no seu{" "}
            <strong>Perfil → Seus dados</strong>, você pode:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground/90">
            <li><strong>Exportar</strong> tudo o que temos sobre você (JSON);</li>
            <li><strong>Apagar</strong> definitivamente sua conta e dados;</li>
            <li><strong>Desligar</strong> lembretes e resumos, sem perder o progresso.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">IA e terceiros</h2>
          <p className="text-foreground/90">
            A correção de redações e o tutor usam provedores de IA (Google
            Gemini e parceiros de contingência). Enviamos apenas o texto
            necessário para a tarefa, sem identificadores além de um código
            interno, e as respostas são validadas antes de chegar a você.
            Vídeos aparecem incorporados oficialmente do YouTube; esses
            serviços podem aplicar as próprias políticas ao carregar.
          </p>
        </section>
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Última atualização: outubro de 2026
      </p>
    </main>
  );
}
