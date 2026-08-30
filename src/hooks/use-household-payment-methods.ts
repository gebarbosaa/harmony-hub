import { useMemo } from "react";
import { useHouseholdTable } from "@/hooks/use-household-data";

type PaymentMethod = { id: string; name: string; description: string | null; kind: string; card_id: string | null; household_id: string };

export function useHouseholdPaymentMethods() {
  const query = useHouseholdTable<PaymentMethod>(
    "household_payment_methods",
    "id,name,description,kind,card_id,household_id",
    "name",
  );
  const options = useMemo(
    () => query.rows.map((payment) => ({ value: payment.kind, label: payment.name.toUpperCase(), id: payment.id, cardId: payment.card_id })),
    [query.rows],
  );
  return { ...query, options };
}
