import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/termos-de-servico")({
  head: () => ({
    meta: [
      { title: "TERMOS DE SERVIÇO — HARMONY HUB" },
      { name: "description", content: "Termos de Serviço do Harmony Hub." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <main className="mx-auto max-w-3xl">
        <header className="mb-8">
          <Link to="/" className="text-sm font-semibold text-primary hover:underline">← VOLTAR AO HARMONY HUB</Link>
          <div className="mt-8 flex items-center gap-3">
            <span className="gradient-primary flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black text-primary-foreground">H</span>
            <div><p className="label-caps text-lg font-bold tracking-[0.16em]">HARMONY HUB</p><p className="text-xs text-muted-foreground">Gestão financeira</p></div>
          </div>
          <h1 className="mt-8 text-3xl font-bold tracking-tight">Termos de Serviço</h1>
          <p className="mt-2 text-sm text-muted-foreground">Última atualização: 8 de setembro de 2026</p>
        </header>

        <article className="space-y-7 text-sm leading-7 text-muted-foreground">
          <section><h2 className="mb-2 text-lg font-semibold text-foreground">1. Aceitação</h2><p>Ao criar uma conta ou utilizar o Harmony Hub, você concorda com estes Termos de Serviço e com a Política de Privacidade. Se não concordar com estes termos, não utilize o serviço.</p></section>
          <section><h2 className="mb-2 text-lg font-semibold text-foreground">2. O serviço</h2><p>O Harmony Hub é uma ferramenta de organização financeira. O serviço permite cadastrar, visualizar e organizar informações financeiras pessoais e compartilhadas, conforme as funcionalidades disponíveis em cada momento.</p></section>
          <section><h2 className="mb-2 text-lg font-semibold text-foreground">3. Conta e segurança</h2><p>Você é responsável pelas informações fornecidas no cadastro e por manter suas credenciais seguras. Não compartilhe sua senha. Ao utilizar login com Google, a autenticação segue os mecanismos de segurança disponibilizados pelo Google e pelo provedor de autenticação do Harmony Hub.</p></section>
          <section><h2 className="mb-2 text-lg font-semibold text-foreground">4. Informações financeiras</h2><p>Os registros financeiros inseridos no Harmony Hub são fornecidos pelo usuário. O aplicativo é uma ferramenta de organização e não constitui aconselhamento financeiro, contábil, jurídico ou de investimentos. Verifique os dados antes de tomar decisões financeiras.</p></section>
          <section><h2 className="mb-2 text-lg font-semibold text-foreground">5. Uso permitido</h2><p>Você deve utilizar o Harmony Hub de maneira lícita e não pode tentar comprometer sua segurança, acessar contas de terceiros sem autorização, explorar vulnerabilidades ou utilizar o serviço para atividades fraudulentas.</p></section>
          <section><h2 className="mb-2 text-lg font-semibold text-foreground">6. Disponibilidade</h2><p>Buscamos manter o serviço disponível e confiável, mas funcionalidades podem ser alteradas, suspensas ou temporariamente interrompidas para manutenção, segurança, correções ou outros motivos operacionais.</p></section>
          <section><h2 className="mb-2 text-lg font-semibold text-foreground">7. Propriedade intelectual</h2><p>O software, a interface, a identidade visual e os elementos próprios do Harmony Hub são protegidos pelas leis aplicáveis. Estes termos não transferem ao usuário direitos de propriedade intelectual sobre o serviço.</p></section>
          <section><h2 className="mb-2 text-lg font-semibold text-foreground">8. Encerramento</h2><p>Você pode deixar de utilizar o serviço e solicitar a exclusão da conta pelos canais disponibilizados. Podemos restringir ou encerrar o acesso quando necessário para proteger o serviço, cumprir a lei ou responder a uso indevido.</p></section>
          <section><h2 className="mb-2 text-lg font-semibold text-foreground">9. Alterações destes termos</h2><p>Estes termos podem ser atualizados quando houver mudanças relevantes no serviço ou nas exigências legais. A versão vigente será publicada nesta página com a data de atualização.</p></section>
          <section><h2 className="mb-2 text-lg font-semibold text-foreground">10. Contato</h2><p>Para dúvidas sobre estes termos, utilize o canal de suporte disponibilizado no Harmony Hub ou o e-mail de suporte informado na tela de consentimento do Google.</p></section>
        </article>

        <footer className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          <Link to="/politica-de-privacidade" className="hover:text-primary hover:underline">Política de Privacidade</Link>
          <span className="mx-2">•</span>
          <Link to="/login" className="hover:text-primary hover:underline">Entrar no Harmony Hub</Link>
        </footer>
      </main>
    </div>
  );
}
