import { createFileRoute } from "@tanstack/react-router";

type TransactionRow = {
  id: string;
  date: string;
  description: string;
  amount: number | string;
  type: string;
  category: string | null;
  paid: boolean;
  card_id: string | null;
  card_name: string | null;
  responsible: string | null;
  source_type: string | null;
  third_party_expense_id: string | null;
  installment_current: number | null;
  installment_total: number | null;
};

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store, private", "Vary": "Authorization" },
  });
}

export const Route = createFileRoute("/api/jarvis/finance")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authorization = request.headers.get("authorization") ?? "";
        const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
        if (!token || token.length < 32) return json({ error: "Não autorizado." }, 401);

        try {
          // This admin client is imported only inside the server handler; its service key
          // must never enter the browser bundle.
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: integration, error: integrationError } = await supabaseAdmin
            .from("jarvis_integrations")
            .select("household_id,status")
            .eq("jarvis_token", token)
            .eq("status", "connected")
            .maybeSingle();

          if (integrationError) {
            console.error("[api/jarvis/finance] integration lookup failed", integrationError.message);
            return json({ error: "Não foi possível validar a integração." }, 500);
          }
          if (!integration?.household_id) return json({ error: "Integração inválida ou revogada." }, 401);

          const householdId = integration.household_id;
          const now = new Date();
          const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit",
          }).formatToParts(now);
          const year = parts.find((part) => part.type === "year")?.value ?? String(now.getFullYear());
          const month = parts.find((part) => part.type === "month")?.value ?? String(now.getMonth() + 1).padStart(2, "0");
          const period = `${year}-${month}`;
          const monthStart = `${period}-01`;
          const nextMonth = new Date(Date.UTC(Number(year), Number(month), 1)).toISOString().slice(0, 10);

          const [transactionsResult, cardsResult, invoicesResult, installmentsResult, fixedCostsResult] = await Promise.all([
            supabaseAdmin.from("transactions")
              .select("id,date,description,amount,type,category,paid,card_id,card_name,responsible,source_type,third_party_expense_id,installment_current,installment_total")
              .eq("household_id", householdId)
              .gte("date", monthStart).lt("date", nextMonth)
              .order("date", { ascending: false }).limit(100),
            supabaseAdmin.from("cards")
              .select("id,name,brand,last4,credit_limit,close_day,due_day")
              .eq("household_id", householdId).order("name"),
            supabaseAdmin.from("invoices")
              .select("id,card_id,period,total,status")
              .eq("household_id", householdId).eq("period", period),
            supabaseAdmin.from("installments")
              .select("id,name,purchase_date,total_amount,installments_count,paid_count,category,responsible,card_id,card_name")
              .eq("household_id", householdId).order("purchase_date", { ascending: false }).limit(100),
            supabaseAdmin.from("fixed_costs")
              .select("id,name,amount,due_day,category,responsible")
              .eq("household_id", householdId).order("due_day").limit(100),
          ]);

          const results = [transactionsResult, cardsResult, invoicesResult, installmentsResult, fixedCostsResult];
          const failed = results.find((result) => result.error);
          if (failed?.error) {
            console.error("[api/jarvis/finance] finance query failed", failed.error.message);
            return json({ error: "Não foi possível carregar os dados financeiros." }, 500);
          }

          const transactions = (transactionsResult.data ?? []) as TransactionRow[];
          const counted = (row: TransactionRow) => row.type !== "DESPESA" || !row.card_id || row.paid;
          const total = (type: string) => transactions
            .filter((row) => row.type === type && counted(row))
            .reduce((sum, row) => sum + Number(row.amount || 0), 0);
          const income = total("RECEITA");
          const expenses = total("DESPESA");
          const investments = total("INVESTIMENTO");
          const invoices = invoicesResult.data ?? [];
          const cards = cardsResult.data ?? [];
          const installments = installmentsResult.data ?? [];
          const fixedCosts = fixedCostsResult.data ?? [];

          return json({
            ok: true,
            period,
            summary: {
              income,
              expenses,
              investments,
              balance: income - expenses - investments,
              invoice_total: invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
              cards_count: cards.length,
              installments_count: installments.length,
              fixed_costs_count: fixedCosts.length,
            },
            transactions,
            cards,
            invoices,
            installments,
            fixed_costs: fixedCosts,
            synced_at: new Date().toISOString(),
          });
        } catch (error) {
          console.error("[api/jarvis/finance] unexpected error", error);
          return json({ error: "Erro interno ao consultar as finanças." }, 500);
        }
      },
    },
  },
});
