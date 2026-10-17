import { useInfiniteQuery, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type HouseholdRow = Record<string, unknown> & { id: string; household_id: string };

type SharedRealtimeEntry = {
  channel: ReturnType<typeof supabase.channel>;
  refs: number;
  queryClient: QueryClient;
};

// Keep one Supabase Realtime channel per household, even when many modules are mounted.
const householdRealtimeChannels = new Map<string, SharedRealtimeEntry>();

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
  const queryKey = useMemo(() => ["household", householdId, table, select, orderBy] as const, [householdId, table, select, orderBy]);

  const query = useQuery({
    queryKey,
    enabled: Boolean(householdId),
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: true,
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
    const existing = householdRealtimeChannels.get(householdId);
    if (existing) {
      existing.refs += 1;
    } else {
      const channel = supabase
        .channel(`household-sync:${householdId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", filter: `household_id=eq.${householdId}` },
          (payload) => {
            void queryClient.invalidateQueries({ queryKey: ["household", householdId] });
            if (payload.table === "accounts_payable") {
              void queryClient.invalidateQueries({ queryKey: ["contas-a-pagar", householdId] });
            }
          },
        )
        .subscribe();
      householdRealtimeChannels.set(householdId, { channel, refs: 1, queryClient });
    }
    return () => {
      const entry = householdRealtimeChannels.get(householdId);
      if (!entry) return;
      entry.refs -= 1;
      if (entry.refs <= 0) {
        householdRealtimeChannels.delete(householdId);
        void supabase.removeChannel(entry.channel);
      }
    };
  }, [householdId, queryClient]);

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
        await queryClient.invalidateQueries({ queryKey: ["household", householdId] });
        if (table === "accounts_payable") {
          await queryClient.invalidateQueries({ queryKey: ["contas-a-pagar", householdId] });
        }
        emitSyncEvent("synced");
        return data as T;
      } catch (error) {
        emitSyncEvent("error");
        throw error;
      }
    },
    [householdId, table, queryClient],
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
        await queryClient.invalidateQueries({ queryKey: ["household", householdId] });
        if (table === "accounts_payable") {
          await queryClient.invalidateQueries({ queryKey: ["contas-a-pagar", householdId] });
        }
        emitSyncEvent("synced");
        return data as T;
      } catch (error) {
        emitSyncEvent("error");
        throw error;
      }
    },
    [householdId, table, queryClient],
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
        await queryClient.invalidateQueries({ queryKey: ["household", householdId] });
        if (table === "accounts_payable") {
          await queryClient.invalidateQueries({ queryKey: ["contas-a-pagar", householdId] });
        }
        emitSyncEvent("synced");
      } catch (error) {
        emitSyncEvent("error");
        throw error;
      }
    },
    [householdId, table, queryClient],
  );

  return { ...query, rows: query.data ?? [], insert, update, remove, householdId };
}


/** Server-filtered, offset-paginated reads for large household tables. */
export function useHouseholdPagedTable<T extends HouseholdRow = HouseholdRow>(
  table: string,
  select: string,
  orderBy: string,
  dateFrom: string,
  dateTo: string,
  pageSize = 100,
) {
  const householdId = useHouseholdId();
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ["household", householdId, table, select, orderBy, dateFrom, dateTo, "paged"] as const,
    [householdId, table, select, orderBy, dateFrom, dateTo],
  );
  const query = useInfiniteQuery({
    queryKey,
    enabled: Boolean(householdId),
    initialPageParam: 0,
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: true,
    queryFn: async ({ pageParam }) => {
      if (!householdId) return { rows: [] as T[], totalCount: 0, nextOffset: undefined as number | undefined };
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select(select, { count: "exact" })
          .eq("household_id", householdId)
          .gte("date", dateFrom)
          .lte("date", dateTo)
          .order(orderBy, { ascending: false })
          .range(pageParam, pageParam + pageSize - 1);
        if (error) throw error;
        const rows = (data ?? []) as unknown as T[];
        return { rows, totalCount: count ?? 0, nextOffset: rows.length === pageSize ? pageParam + pageSize : undefined };
      } catch (error) {
        emitSyncEvent("error");
        throw error;
      }
    },
    getNextPageParam: lastPage => lastPage.nextOffset,
  });
  const rows = useMemo(() => query.data?.pages.flatMap(page => page.rows) ?? [], [query.data]);
  useEffect(() => {
    if (!householdId) return;
    const existing = householdRealtimeChannels.get(householdId);
    if (existing) existing.refs += 1;
    else {
      const channel = supabase
        .channel(`household-sync:${householdId}`)
        .on("postgres_changes", { event: "*", schema: "public", filter: `household_id=eq.${householdId}` }, payload => {
          void queryClient.invalidateQueries({ queryKey: ["household", householdId] });
          if (payload.table === "accounts_payable") void queryClient.invalidateQueries({ queryKey: ["contas-a-pagar", householdId] });
        })
        .subscribe();
      householdRealtimeChannels.set(householdId, { channel, refs: 1, queryClient });
    }
    return () => {
      const entry = householdRealtimeChannels.get(householdId);
      if (!entry) return;
      entry.refs -= 1;
      if (entry.refs <= 0) { householdRealtimeChannels.delete(householdId); void supabase.removeChannel(entry.channel); }
    };
  }, [householdId, queryClient]);
  return { ...query, rows, totalCount: query.data?.pages[0]?.totalCount ?? 0 };
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
