import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, CreditCard, Pencil, Plus, Trash2, X } from "lucide-react";
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

type Card = { id: string; name: string; brand: string | null; last4: string | null; credit_limit: number; close_day: number; due_day: number; account_id: string | null; household_id: string };

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

  const cards = useHouseholdTable<Card>("cards", "id,name,brand,last4,credit_limit,close_day,due_day,account_id,household_id");
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardEdit, setCardEdit] = useState<string | null>(null);
  const [cardName, setCardName] = useState("");
  const [brand, setBrand] = useState("");
  const [last4, setLast4] = useState("");
  const [limit, setLimit] = useState("");
  const [close, setClose] = useState("28");
  const [due, setDue] = useState("5");
  const [cardAccountId, setCardAccountId] = useState("");

  function clearCardForm() { setCardEdit(null); setCardName(""); setBrand(""); setLast4(""); setLimit(""); setClose("28"); setDue("5"); setCardAccountId(""); }
  function openNewCard() { clearCardForm(); setCardModalOpen(true); }
  function startCardEdit(card: Card) { setCardEdit(card.id); setCardName(card.name); setBrand(card.brand ?? ""); setLast4(card.last4 ?? ""); setLimit(String(card.credit_limit ?? 0)); setClose(String(card.close_day ?? 28)); setDue(String(card.due_day ?? 5)); setCardAccountId(card.account_id ?? ""); setCardModalOpen(true); }
  async function saveCard() {
    const value = Number(limit.replace(",", "."));
    const closeDay = Number(close);
    const dueDay = Number(due);
    if (!cardName.trim() || value <= 0) return toast.error("PREENCHA O CARTÃO E O LIMITE");
    if (closeDay < 1 || closeDay > 31 || dueDay < 1 || dueDay > 31) return toast.error("INFORME DIAS VÁLIDOS DE FECHAMENTO E VENCIMENTO");
    const payload = { name: cardName.trim().toUpperCase(), brand: brand.trim().toUpperCase() || null, last4: last4.trim() || null, credit_limit: value, close_day: closeDay, due_day: dueDay, account_id: cardAccountId || null };
    try {
      if (cardEdit) { await cards.update(cardEdit, payload); toast.success("CARTÃO ATUALIZADO"); }
      else { await cards.insert(payload); toast.success("CARTÃO CADASTRADO E VINCULADO AO BANCO"); }
      clearCardForm();
      setCardModalOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO SALVAR CARTÃO"); }
  }
  async function deleteCard(id: string) {
    if (!window.confirm("EXCLUIR ESTE CARTÃO?")) return;
    try { await cards.remove(id); toast.success("CARTÃO EXCLUÍDO"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO EXCLUIR CARTÃO"); }
  }

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

      <Panel
        title="CARTÕES DE CRÉDITO"
        action={
          <button type="button" onClick={openNewCard} className="gradient-primary flex items-center gap-2 rounded-xl px-4 py-3 text-[10px] font-bold text-primary-foreground">
            <Plus className="h-4 w-4" />
            NOVO CARTÃO
          </button>
        }
      >
        {cards.rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <CreditCard className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">NENHUM CARTÃO CADASTRADO.</p>
            <p className="mt-1 text-xs text-muted-foreground">VINCULE UM CARTÃO A UM BANCO PARA ORGANIZAR AS FATURAS.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cards.rows.map((card) => {
              const linkedAccount = accounts.rows.find((a) => a.id === card.account_id);
              return (
                <div key={card.id} className="rounded-2xl border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <CreditCard className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{card.name}</p>
                        <p className="text-[10px] text-muted-foreground">{card.brand ?? "CARTÃO"}{card.last4 ? ` •••• ${card.last4}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => startCardEdit(card)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-primary" aria-label="EDITAR CARTÃO">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => void deleteCard(card.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-danger" aria-label="EXCLUIR CARTÃO">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                    <div><p className="text-muted-foreground">LIMITE</p><p className="font-semibold">R$ {Number(card.credit_limit ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
                    <div><p className="text-muted-foreground">FECHA</p><p className="font-semibold">DIA {card.close_day}</p></div>
                    <div><p className="text-muted-foreground">VENCE</p><p className="font-semibold">DIA {card.due_day}</p></div>
                  </div>
                  <div className="mt-3">
                    {linkedAccount ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-[10px] font-semibold">
                        <Building2 className="h-3 w-3" />{linkedAccount.institution || linkedAccount.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1 text-[10px] text-muted-foreground">SEM BANCO VINCULADO</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {cardModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={cardEdit ? "Editar cartão" : "Adicionar cartão"}
          onMouseDown={(event) => { if (event.target === event.currentTarget) { clearCardForm(); setCardModalOpen(false); } }}
        >
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-background p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">{cardEdit ? "EDITAR CARTÃO" : "ADICIONAR CARTÃO"}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">Vincule o cartão a um banco cadastrado. Ele também é sincronizado automaticamente em Formas de Pagamento como crédito.</p>
              </div>
              <button onClick={() => { clearCardForm(); setCardModalOpen(false); }} className="rounded-full p-2 hover:bg-secondary" aria-label="Fechar"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <input autoFocus value={cardName} onChange={(event) => setCardName(event.target.value)} placeholder="NOME DO CARTÃO *" className="w-full rounded-xl border p-3" />
              <label className="block">
                <span className="label-caps text-[10px]">BANCO VINCULADO</span>
                <select value={cardAccountId} onChange={(event) => setCardAccountId(event.target.value)} className="mt-1 w-full rounded-xl border bg-background p-3">
                  <option value="">SEM BANCO VINCULADO</option>
                  {accounts.rows.map((a) => <option key={a.id} value={a.id}>{a.name}{a.institution ? ` — ${a.institution}` : ""}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="BANDEIRA" className="rounded-xl border p-3" />
                <input value={last4} onChange={(event) => setLast4(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="4 ÚLTIMOS DÍGITOS" inputMode="numeric" className="rounded-xl border p-3" />
                <input value={limit} onChange={(event) => setLimit(event.target.value)} placeholder="LIMITE *" inputMode="decimal" className="rounded-xl border p-3 sm:col-span-2" />
                <input value={close} onChange={(event) => setClose(event.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="DIA DE FECHAMENTO" inputMode="numeric" className="rounded-xl border p-3" />
                <input value={due} onChange={(event) => setDue(event.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="DIA DE VENCIMENTO" inputMode="numeric" className="rounded-xl border p-3" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => void saveCard()} className="gradient-primary flex-1 rounded-xl p-3 text-[11px] font-bold text-primary-foreground">{cardEdit ? "SALVAR ALTERAÇÕES" : "CADASTRAR CARTÃO"}</button>
                <button onClick={() => { clearCardForm(); setCardModalOpen(false); }} className="rounded-xl border px-4 text-[11px]">CANCELAR</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
