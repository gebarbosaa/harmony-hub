import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel, Tag } from "@/components/ui-kit";
import { members } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "CONFIGURAÇÕES — MULTICAP" },
      { name: "description", content: "Perfil, membros, categorias, backup e exportação de dados." },
      { property: "og:title", content: "CONFIGURAÇÕES — MULTICAP" },
      {
        property: "og:description",
        content: "Perfil, membros, categorias, backup e exportação de dados.",
      },
    ],
  }),
  component: SettingsPage,
});

const CATEGORIES = ["MORADIA", "ALIMENTAÇÃO", "TRANSPORTE", "LAZER", "SAÚDE", "IMPOSTOS", "RENDA"];
const METHODS = ["PIX", "DÉBITO", "CARTÃO NUBANK", "CARTÃO INTER", "BOLETO", "DINHEIRO"];

function SettingsPage() {
  const [confirm, setConfirm] = useState("");

  return (
    <div className="space-y-5">
      <PageHeader title="CONFIGURAÇÕES" subtitle="Perfil, membros e gestão de dados da casa." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="PERFIL">
          <div className="space-y-3">
            {[
              ["NOME", "Maria Barbosa"],
              ["E-MAIL", "maria@multicap.app"],
              ["MOEDA", "BRL — Real"],
            ].map(([label, value]) => (
              <label key={label} className="block">
                <span className="label-caps text-[10px] text-muted-foreground">{label}</span>
                <input
                  defaultValue={value}
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>
            ))}
            <button
              onClick={() => toast.success("PERFIL ATUALIZADO")}
              className="gradient-primary label-caps w-full rounded-xl px-4 py-2.5 text-[11px] text-primary-foreground"
            >
              SALVAR PERFIL
            </button>
          </div>
        </Panel>

        <Panel title="MEMBROS DA CONTA">
          <div className="space-y-3">
            {members.map((m) => (
              <div
                key={m.name}
                className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-3 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-background"
                    style={{ background: m.color }}
                  >
                    {m.initials}
                  </span>
                  <div>
                    <p className="label-caps text-[11px]">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground">Acesso total</p>
                  </div>
                </div>
                <Tag tone="primary">ATIVO</Tag>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="GERENCIADOR GLOBAL">
          <p className="label-caps mb-2 text-[10px] text-muted-foreground">CATEGORIAS</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <span
                key={c}
                className="label-caps rounded-lg border border-primary/50 bg-background px-3 py-1.5 text-[10px]"
              >
                {c}
              </span>
            ))}
          </div>
          <p className="label-caps mb-2 mt-4 text-[10px] text-muted-foreground">
            FORMAS DE PAGAMENTO
          </p>
          <div className="flex flex-wrap gap-2">
            {METHODS.map((c) => (
              <span
                key={c}
                className="label-caps rounded-lg border border-border bg-background px-3 py-1.5 text-[10px] text-muted-foreground"
              >
                {c}
              </span>
            ))}
          </div>
        </Panel>

        <Panel title="BACKUP E EXPORTAÇÃO">
          <div className="grid grid-cols-2 gap-2">
            {["EXCEL", "CSV", "JSON", "PDF"].map((f) => (
              <button
                key={f}
                onClick={() => toast.success(`EXPORTAÇÃO ${f} INICIADA`)}
                className="label-caps rounded-xl border border-border px-3 py-2.5 text-[10px] transition-colors hover:border-primary hover:text-primary"
              >
                EXPORTAR {f}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-3 text-[11px] text-muted-foreground">
            Último backup: 17 AGO 2026, 22:10 · backup automático ativo.
          </div>
        </Panel>
      </div>

      <Panel title="ZONA DE PERIGO" className="border-danger/50">
        <p className="text-xs text-muted-foreground">
          Estas ações são irreversíveis. Digite <strong className="text-danger">EXCLUIR</strong> para
          liberar.
        </p>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Digite EXCLUIR"
          className="mt-3 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-danger md:w-64"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {["LIMPAR LANÇAMENTOS", "EXCLUIR TODOS OS DADOS", "RESTAURAR FÁBRICA", "ENCERRAR CONTA"].map(
            (action) => (
              <button
                key={action}
                disabled={confirm !== "EXCLUIR"}
                onClick={() => toast.error(`${action} — confirmação necessária no backend`)}
                className={cn(
                  "label-caps rounded-xl border px-3 py-2 text-[10px] transition-colors",
                  confirm === "EXCLUIR"
                    ? "border-danger text-danger hover:bg-danger/10"
                    : "border-border text-muted-foreground opacity-50",
                )}
              >
                {action}
              </button>
            ),
          )}
        </div>
      </Panel>
    </div>
  );
}
