import { useMemo } from "react";
import { useHouseholdTable } from "@/hooks/use-household-data";

type PaymentMethod = { id: string; name: string; description: string | null; household_id: string };

export function useHouseholdPaymentMethods() {
  const query = useHouseholdTable<PaymentMethod>(
    "household_payment_methods",
    "id,name,description,household_id",
    "name",
  );
  const options = useMemo(
    () => query.rows.map((payment) => ({ value: payment.name, label: payment.name.toUpperCase() })),
    [query.rows],
  );
  return { ...query, options };
}
