import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, Tag } from "@/components/ui-kit";
import { useHouseholdTable } from "@/hooks/use-household-data";

export const Route = createFileRoute("/anotacoes")({ head: () => ({ meta: [{ title: "ANOTAÇÕES — HARMONY HUB" }] }), component: NotesPage });
type Note = { id: string; title: string; content: string; category: string; household_id: string };
type Account = { id: string; name: string; institution: string | null; account_type: string; notes: string | null; household_id: string };
type Pix = { id: string; label: string; key_type: string; pix_key: string; institution: string | null; household_id: string };

function NotesPage() {
  const notes = useHouseholdTable<Note>("harmony_notes", "id,title,content,category,household_id");
  const accounts = useHouseholdTable<Account>("household_accounts", "id,name,institution,account_type,notes,household_id");
  const pix = useHouseholdTable<Pix>("pix_keys", "id,label,key_type,pix_key,institution,household_id");
  const [kind, setKind] = useState<"NOTE" | "ACCOUNT" | "PIX">("NOTE");
  const [title, setTitle] = useState(""); const [content, setContent] = useState(""); const [institution, setInstitution] = useState(""); const [keyType, setKeyType] = useState("CPF"); const [pixKey, setPixKey] = useState("");

  async function add() {
    try {
      if (kind === "NOTE") { if (!title.trim()) return toast.error("INFORME O TÍTULO"); await notes.insert({ title: title.trim().toUpperCase(), content: content.trim(), category: "ANOTAÇÃO" }); }
      if (kind === "ACCOUNT") { if (!title.trim()) return toast.error("INFORME O NOME DA CONTA"); await accounts.insert({ name: title.trim().toUpperCase(), institution: institution.trim().toUpperCase() || null, account_type: "CONTA CORRENTE", notes: content.trim() || null }); }
      if (kind === "PIX") { if (!title.trim() || !pixKey.trim()) return toast.error("PREENCHA A IDENTIFICAÇÃO E A CHAVE PIX"); await pix.insert({ label: title.trim().toUpperCase(), key_type: keyType, pix_key: pixKey.trim(), institution: institution.trim().toUpperCase() || null }); }
      setTitle(""); setContent(""); setInstitution(""); setPixKey(""); toast.success("REGISTRO SALVO");
    } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO SALVAR"); }
  }
  async function remove(table: "notes" | "accounts" | "pix", id: string) { try { await ({ notes, accounts, pix }[table]).remove(id); toast.success("REGISTRO EXCLUÍDO"); } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO EXCLUIR"); } }

  return <div className="space-y-5">
    <PageHeader title="ANOTAÇÕES" subtitle="CONTAS, CHAVES PIX E INFORMAÇÕES ÚTEIS DA CASA EM UM SÓ LUGAR." />
    <div className="grid grid-cols-3 gap-2"><button onClick={() => setKind("NOTE")} className={`rounded-xl border p-3 text-[10px] ${kind === "NOTE" ? "border-primary text-primary" : "border-border"}`}>📝 ANOTAÇÕES</button><button onClick={() => setKind("ACCOUNT")} className={`rounded-xl border p-3 text-[10px] ${kind === "ACCOUNT" ? "border-primary text-primary" : "border-border"}`}>💳 CONTAS</button><button onClick={() => setKind("PIX")} className={`rounded-xl border p-3 text-[10px] ${kind === "PIX" ? "border-primary text-primary" : "border-border"}`}>🔑 CHAVES PIX</button></div>
    <Panel title={kind === "NOTE" ? "NOVA ANOTAÇÃO" : kind === "ACCOUNT" ? "NOVA CONTA" : "NOVA CHAVE PIX"}>
      <div className="grid gap-2 md:grid-cols-2">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder={kind === "PIX" ? "IDENTIFICAÇÃO" : kind === "ACCOUNT" ? "NOME DA CONTA" : "TÍTULO"} className="rounded-xl border border-input bg-background p-3" />
        {kind === "PIX" && <select value={keyType} onChange={e => setKeyType(e.target.value)} className="rounded-xl border border-input bg-background p-3"><option>CPF</option><option>CELULAR</option><option>E-MAIL</option><option>ALEATÓRIA</option></select>}
        {(kind === "ACCOUNT" || kind === "PIX") && <input value={institution} onChange={e => setInstitution(e.target.value)} placeholder="BANCO / INSTITUIÇÃO" className="rounded-xl border border-input bg-background p-3" />}
        {kind === "PIX" && <input value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="CHAVE PIX" className="rounded-xl border border-input bg-background p-3" />}
        {kind !== "PIX" && <textarea value={content} onChange={e => setContent(e.target.value)} placeholder={kind === "ACCOUNT" ? "OBSERVAÇÕES" : "CONTEÚDO"} className="min-h-24 rounded-xl border border-input bg-background p-3 md:col-span-2" />}
        <button onClick={() => void add()} className="gradient-primary rounded-xl p-3 text-[11px] text-primary-foreground md:col-span-2"><Plus className="mr-1 inline h-4 w-4" />SALVAR</button>
      </div>
    </Panel>
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel title="ANOTAÇÕES"><div className="space-y-2">{notes.rows.map(n => <div key={n.id} className="rounded-xl border p-3"><div className="flex justify-between gap-2"><p className="label-caps text-[11px]">{n.title}</p><button onClick={() => void remove("notes", n.id)}><Trash2 className="h-4 w-4 text-danger" /></button></div><p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{n.content}</p></div>)}{notes.rows.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">NENHUMA ANOTAÇÃO.</p>}</div></Panel>
      <Panel title="CONTAS"><div className="space-y-2">{accounts.rows.map(a => <div key={a.id} className="rounded-xl border p-3"><div className="flex justify-between gap-2"><div><p className="label-caps text-[11px]">{a.name}</p><p className="text-[10px] text-muted-foreground">{a.institution || "SEM INSTITUIÇÃO"}</p></div><button onClick={() => void remove("accounts", a.id)}><Trash2 className="h-4 w-4 text-danger" /></button></div><Tag>{a.account_type}</Tag></div>)}{accounts.rows.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">NENHUMA CONTA CADASTRADA.</p>}</div></Panel>
      <Panel title="CHAVES PIX"><div className="space-y-2">{pix.rows.map(p => <div key={p.id} className="rounded-xl border p-3"><div className="flex justify-between gap-2"><div><p className="label-caps text-[11px]">{p.label}</p><p className="text-[10px] text-muted-foreground">{p.key_type} · {p.institution || "SEM BANCO"}</p></div><button onClick={() => void remove("pix", p.id)}><Trash2 className="h-4 w-4 text-danger" /></button></div><div className="mt-2 flex items-center gap-2 rounded-lg bg-secondary/40 p-2"><span className="min-w-0 flex-1 truncate text-xs">{p.pix_key}</span><button onClick={() => { void navigator.clipboard.writeText(p.pix_key); toast.success("CHAVE COPIADA"); }} aria-label="COPIAR CHAVE PIX"><Copy className="h-4 w-4 text-primary" /></button></div></div>)}{pix.rows.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">NENHUMA CHAVE PIX.</p>}</div></Panel>
    </div>
  </div>;
}
