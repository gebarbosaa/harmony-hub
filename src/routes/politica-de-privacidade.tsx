import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: "POLÍTICA DE PRIVACIDADE — HARMONY HUB" },
      { name: "description", content: "Política de Privacidade do Harmony Hub." },
    ],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <main className="mx-auto max-w-3xl">
        <header className="mb-8">
          <Link to="/" className="text-sm font-semibold text-primary hover:underline">← VOLTAR AO HARMONY HUB</Link>
          <div className="mt-8 flex items-center gap-3">
            <span className="gradient-primary flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black text-primary-foreground">H</span>
            <div>
              <p className="label-caps text-lg font-bold tracking-[0.16em]">HARMONY HUB</p>
              <p className="text-xs text-muted-foreground">Gestão financeira</p>
            </div>
          </div>
          <h1 className="mt-8 text-3xl font-bold tracking-tight">Política de Privacidade</h1>
          <p className="mt-2 text-sm text-muted-foreground">Última atualização: 8 de setembro de 2026</p>
        </header>

        <article className="space-y-7 text-sm leading-7 text-muted-foreground">
          <section><h2 className="mb-2 text-lg font-semibold text-foreground">1. Sobre esta política</h2><p>Esta Política de Privacidade explica como o Harmony Hub trata informações quando você cria uma conta e utiliza o serviço de gestão financeira. O Harmony Hub foi desenvolvido para organizar informações financeiras pessoais e compartilhadas pelo usuário.</p></section>
          <section><h2 className="mb-2 text-lg font-semibold text-foreground">2. Informações que coletamos</h2><p>Podemos tratar informações fornecidas por você, como nome, endereço de e-mail, informações de autenticação e dados financeiros que você escolhe cadastrar no serviço, incluindo receitas, despesas, contas, cartões, parcelas, custos fixos, assinaturas, investimentos e metas.</p></section>
          <section><h2 className="mb-2 text-lg font-semibold text-foreground">3. Login com Google</h2><p>Quando você escolhe entrar com o Google, o Google pode compartilhar com o Harmony Hub, mediante sua autorização, informações básicas da sua conta, como nome, endereço de e-mail e foto de perfil. O Harmony Hub usa essas informações para criar ou identificar sua conta e personalizar sua experiência. O Harmony Hub não solicita acesso ao Gmail, Google Drive ou Google Agenda para o login.</p></section>
          <section><h2 className="mb-2 text-lg font-semibold text-foreground">4. Como usamos as informações</h2><p>Usamos as informações para autenticar sua conta, fornecer e manter as funcionalidades do Harmony Hub, organizar seus registros financeiros, sincronizar informações dentro do seu grupo quando aplicável, proteger o serviço, corrigir problemas e melhorar a experiência.</p></section>
          <section><h2 className="mb-2 text-lg font-semibold text-foreground">5. Compartilhamento</h2><p>Não vendemos suas informações pessoais. O serviço pode utilizar provedores de infraestrutura e autenticação, como o Supabase e o Google, para executar funcionalidades solicitadas por você. O acesso é limitado ao necessário para prestar o serviço e cumprir obrigações legais.</p></section>
          <section><h2 className="mb-2 text-lg font-semibold text-foreground">6. Armazenamento e segurança</h2><p>Os dados do Harmony Hub são armazenados em infraestrutura de terceiros utilizada pelo serviço, com controles de autenticação e autorização. Nenhum sistema conectado à internet pode garantir segurança absoluta, mas adotamos medidas técnicas e organizacionais razoáveis para proteger os dados.</p></section>
          <section><h2 className="mb-2 text-lg font-semibold text-foreground">7. Retenção e exclusão</h2><p>Os dados são mantidos enquanto forem necessários para fornecer o serviço ou enquanto sua conta permanecer ativa, observadas as obrigações legais aplicáveis. Você pode solicitar a exclusão da sua conta e dos dados associados por meio dos canais de suporte disponibilizados pelo Harmony Hub. Alguns registros poderão ser mantidos quando houver obrigação legal de retenção.</p></section>
          <section><h2 className="mb-2 text-lg font-semibold text-foreground">8. Seus direitos</h2><p>Você pode solicitar informações sobre o tratamento dos seus dados, correção de informações, acesso, portabilidade quando aplicável e exclusão, respeitados os limites previstos na legislação aplicável.</p></section>
          <section><h2 className="mb-2 text-lg font-semibold text-foreground">9. Alterações</h2><p>Esta política pode ser atualizada para refletir mudanças no Harmony Hub, na legislação ou nas práticas de tratamento de dados. A versão vigente será publicada nesta página com a respectiva data de atualização.</p></section>
          <section><h2 className="mb-2 text-lg font-semibold text-foreground">10. Contato</h2><p>Para dúvidas ou solicitações relacionadas à privacidade, utilize o canal de suporte disponibilizado no Harmony Hub ou o e-mail de suporte informado na tela de consentimento do Google.</p></section>
        </article>

        <footer className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          <Link to="/termos-de-servico" className="hover:text-primary hover:underline">Termos de Serviço</Link>
          <span className="mx-2">•</span>
          <Link to="/login" className="hover:text-primary hover:underline">Entrar no Harmony Hub</Link>
        </footer>
      </main>
    </div>
  );
}
