import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHouseholdId } from "@/hooks/use-household-data";

export type HouseholdMember = {
  id: string;
  name: string;
  initials: string | null;
  color: string;
  household_id: string | null;
};

export function useHouseholdMembers() {
  const householdId = useHouseholdId();
  return useQuery({
    queryKey: ["household-members", householdId],
    enabled: Boolean(householdId),
    queryFn: async () => {
      if (!householdId) return [] as HouseholdMember[];
      const { data, error } = await supabase
        .from("profiles")
        .select("id,name,initials,color,household_id")
        .eq("household_id", householdId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as HouseholdMember[];
    },
  });
}
