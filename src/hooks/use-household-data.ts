import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type HouseholdRow = Record<string, unknown> & { id: string; household_id: string };

function emitSyncEvent(type: "syncing" | "synced" | "error") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(`harmony:sync:${type}`));
}

export function useHouseholdId() {
  const { profile } = useAuth();
  return profile?.household_id ?? null;
}

export function useHouseholdTable<T extends HouseholdRow = HouseholdRow>(
  table: string,
  select = "*",
  orderBy = "created_at",
) {
  const householdId = useHouseholdId();
  const queryClient = useQueryClient();
  const queryKey = ["household", householdId, table, select, orderBy];

  const query = useQuery({
    queryKey,
    enabled: Boolean(householdId),
    queryFn: async () => {
      if (!householdId) return [] as T[];
      try {
        const { data, error } = await supabase
          .from(table)
          .select(select)
          .eq("household_id", householdId)
          .order(orderBy, { ascending: false });
        if (error) throw error;
        return (data ?? []) as unknown as T[];
      } catch (error) {
        emitSyncEvent("error");
        throw error;
      }
    },
  });

  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`${table}:${householdId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `household_id=eq.${householdId}` },
        () => queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [householdId, table, queryClient, queryKey.join("|")]);

  const insert = useCallback(
    async (values: Record<string, unknown>) => {
      if (!householdId) throw new Error("Nenhum grupo familiar configurado.");
      emitSyncEvent("syncing");
      try {
        const { data, error } = await supabase
          .from(table)
          .insert({ ...values, household_id: householdId })
          .select()
          .single();
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey });
        emitSyncEvent("synced");
        return data as T;
      } catch (error) {
        emitSyncEvent("error");
        throw error;
      }
    },
    [householdId, table, queryClient, queryKey.join("|")],
  );

  const update = useCallback(
    async (id: string, values: Record<string, unknown>) => {
      if (!householdId) throw new Error("Nenhum grupo familiar configurado.");
      emitSyncEvent("syncing");
      try {
        const { data, error } = await supabase
          .from(table)
          .update(values)
          .eq("id", id)
          .eq("household_id", householdId)
          .select()
          .single();
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey });
        emitSyncEvent("synced");
        return data as T;
      } catch (error) {
        emitSyncEvent("error");
        throw error;
      }
    },
    [householdId, table, queryClient, queryKey.join("|")],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!householdId) throw new Error("Nenhum grupo familiar configurado.");
      emitSyncEvent("syncing");
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("id", id)
          .eq("household_id", householdId);
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey });
        emitSyncEvent("synced");
      } catch (error) {
        emitSyncEvent("error");
        throw error;
      }
    },
    [householdId, table, queryClient, queryKey.join("|")],
  );

  return { ...query, rows: query.data ?? [], insert, update, remove, householdId };
}

export async function getCurrentHouseholdProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, household_id, name, initials, color")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
