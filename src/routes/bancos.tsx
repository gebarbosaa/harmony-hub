import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/ui-kit";
import { useHouseholdTable } from "@/hooks/use-household-data";

type Account = {
  id: string;
  name: string;
  institution: string | null;
  account_type: string;
  notes: string | null;
  household_id: string;
};

export const Route = createFileRoute("/bancos")({
  head: () => ({ meta: [{ title: "BANCOS — HARMONY HUB" }] }),
  component: BanksPage,
});

function BanksPage() {
  const accounts = useHouseholdTable<Account>(
    "household_accounts",
    "id,name,institution,account_type,notes,household_id",
    "name",
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [accountType, setAccountType] = useState("CONTA CORRENTE");
  const [notes, setNotes] = useState("");

  function reset() {
    setEditing(null);
    setName("");
    setInstitution("");
    setAccountType("CONTA CORRENTE");
    setNotes("");
  }

  function openNew() {
    reset();
    setOpen(true);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setName(account.name);
    setInstitution(account.institution ?? "");
    setAccountType(account.account_type || "CONTA CORRENTE");
    setNotes(account.notes ?? "");
    setOpen(true);
  }

  async function save() {
    const accountName = name.trim().toUpperCase();
    const bankName = institution.trim().toUpperCase();
    if (!accountName) {
      toast.error("INFORME O NOME DA CONTA");
      return;
    }
    const duplicate = accounts.rows.some(
      (item) =>
        item.id !== editing?.id &&
        item.name.toUpperCase() === accountName &&
        (item.institution ?? "").toUpperCase() === bankName,
    );
    if (duplicate) {
      toast.error("ESSA CONTA JÁ ESTÁ CADASTRADA");
      return;
    }
    const payload = {
      name: accountName,
      institution: bankName || null,
      account_type: accountType,
      notes: notes.trim().toUpperCase() || null,
    };
    try {
      if (editing) {
        await accounts.update(editing.id, payload);
        toast.success("BANCO/CONTA ATUALIZADO");
      } else {
        await accounts.insert(payload);
        toast.success("BANCO/CONTA CADASTRADO");
      }
      reset();
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ERRO AO SALVAR BANCO");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("EXCLUIR ESTE BANCO/CONTA? LANÇAMENTOS VINCULADOS SERÃO PRESERVADOS.")) return;
    try {
      await accounts.remove(id);
      toast.success("BANCO/CONTA EXCLUÍDO");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ERRO AO EXCLUIR BANCO");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="BANCOS"
        subtitle="CONTAS E INSTITUIÇÕES FINANCEIRAS CADASTRADAS NO HUB."
        action={
          <button
            type="button"
            onClick={openNew}
            className="gradient-primary flex items-center gap-2 rounded-xl px-4 py-3 text-[10px] font-bold text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            NOVO BANCO
          </button>
        }
      />

      <Panel title="BANCOS E CONTAS">
        {accounts.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">CARREGANDO...</p>
        ) : accounts.rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">NENHUM BANCO OU CONTA CADASTRADO.</p>
            <p className="mt-1 text-xs text-muted-foreground">CADASTRE SUA PRIMEIRA CONTA PARA USÁ-LA NOS LANÇAMENTOS.</p>
            <button
              type="button"
              onClick={openNew}
              className="gradient-primary mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-3 text-[10px] font-bold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              CADASTRAR BANCO
            </button>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {accounts.rows.map((account) => (
              <div key={account.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="label-caps truncate text-[11px] font-bold">{account.institution || account.name}</p>
                      <p className="mt-1 truncate text-sm font-semibold">{account.name}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => openEdit(account)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-primary" aria-label="EDITAR BANCO">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => void remove(account.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-danger" aria-label="EXCLUIR BANCO">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-lg bg-secondary px-2.5 py-1 text-[10px] font-semibold">{account.account_type}</span>
                  {account.institution && <span className="rounded-lg bg-secondary px-2.5 py-1 text-[10px]">{account.institution}</span>}
                </div>
                {account.notes && <p className="mt-3 text-xs text-muted-foreground">{account.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={editing ? "Editar banco" : "Novo banco"}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
              reset();
            }
          }}
        >
          <div className="w-full rounded-t-3xl bg-background p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl">
            <div className="mb-5">
              <p className="text-sm font-bold">{editing ? "EDITAR BANCO" : "NOVO BANCO"}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">CADASTRE A INSTITUIÇÃO E A CONTA QUE SERÁ USADA NO FINANCEIRO.</p>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="label-caps text-[10px]">BANCO / INSTITUIÇÃO</span>
                <input value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="EX.: NUBANK" className="mt-1 w-full rounded-xl border p-3" />
              </label>
              <label className="block">
                <span className="label-caps text-[10px]">NOME DA CONTA</span>
                <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="EX.: CONTA PRINCIPAL" className="mt-1 w-full rounded-xl border p-3" />
              </label>
              <label className="block">
                <span className="label-caps text-[10px]">TIPO DE CONTA</span>
                <select value={accountType} onChange={(event) => setAccountType(event.target.value)} className="mt-1 w-full rounded-xl border p-3">
                  <option>CONTA CORRENTE</option>
                  <option>CONTA POUPANÇA</option>
                  <option>CONTA DIGITAL</option>
                  <option>CONTA DE INVESTIMENTO</option>
                  <option>OUTRA</option>
                </select>
              </label>
              <label className="block">
                <span className="label-caps text-[10px]">OBSERVAÇÕES</span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="OPCIONAL" className="min-h-20 w-full rounded-xl border p-3" />
              </label>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button type="button" onClick={() => { setOpen(false); reset(); }} className="rounded-xl border px-4 py-3 text-[10px] font-semibold">CANCELAR</button>
                <button type="button" onClick={() => void save()} className="gradient-primary rounded-xl px-4 py-3 text-[10px] font-bold text-primary-foreground">
                  {editing ? "SALVAR ALTERAÇÕES" : "CADASTRAR BANCO"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
