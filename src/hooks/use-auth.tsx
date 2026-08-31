import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = { id: string; household_id: string | null; name: string; initials: string | null; color: string };
type AuthState = { loading: boolean; profileLoading: boolean; session: Session | null; user: User | null; profile: Profile | null; refreshProfile: () => Promise<Profile | null>; setActiveHousehold: (householdId: string) => void; signInWithGoogle: () => Promise<void>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthState | undefined>(undefined);
const ACTIVE_HOUSEHOLD_KEY = "harmony-active-household";

function getStoredHousehold() { try { return localStorage.getItem(ACTIVE_HOUSEHOLD_KEY); } catch { return null; } }
function storeHousehold(id: string | null) { try { if (id) localStorage.setItem(ACTIVE_HOUSEHOLD_KEY, id); else localStorage.removeItem(ACTIVE_HOUSEHOLD_KEY); } catch {} }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const profileRef = useRef<Profile | null>(null);
  const profileRequestRef = useRef(0);

  function setProfileSafe(next: Profile | null) { profileRef.current = next; setProfile(next); if (next?.household_id) storeHousehold(next.household_id); }
  async function loadProfile(userId: string): Promise<Profile | null> {
    const requestId = ++profileRequestRef.current;
    const { data, error } = await supabase.from("profiles").select("id, household_id, name, initials, color").eq("id", userId).maybeSingle();
    if (error) throw error;
    if (requestId !== profileRequestRef.current || sessionRef.current?.user.id !== userId) return profileRef.current;
    const stored = getStoredHousehold();
    const nextProfile = data ? { ...data, household_id: data.household_id ?? stored } : null;
    setProfileSafe(nextProfile);
    return nextProfile;
  }
  async function refreshProfile() {
    const current = sessionRef.current;
    if (!current?.user?.id) return profileRef.current;
    setProfileLoading(true);
    try { return await loadProfile(current.user.id); }
    catch (error) { console.error("Failed to refresh profile", error); return profileRef.current; }
    finally { if (sessionRef.current?.user.id === current.user.id) setProfileLoading(false); }
  }
  function setActiveHousehold(householdId: string) {
    const current = profileRef.current;
    storeHousehold(householdId);
    const next = current ? { ...current, household_id: householdId } : null;
    if (next) setProfileSafe(next);
    setProfileLoading(false);
  }
  useEffect(() => {
    let active = true;
    const applySession = async (nextSession: Session | null) => {
      if (!active) return;
      sessionRef.current = nextSession;
      setSession(nextSession);
      if (!nextSession) { ++profileRequestRef.current; storeHousehold(null); setProfileSafe(null); setProfileLoading(false); setLoading(false); return; }
      setProfileLoading(true);
      try { await loadProfile(nextSession.user.id); }
      catch (error) { if (active) console.error("Failed to load profile", error); }
      finally { if (active && sessionRef.current?.user.id === nextSession.user.id) { setProfileLoading(false); setLoading(false); } }
    };
    void supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => { if (!active || event === "INITIAL_SESSION") return; void applySession(nextSession); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  async function signInWithGoogle() { await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { access_type: "offline", prompt: "consent" }, scopes: "https://www.googleapis.com/auth/calendar.events" } }); }
  async function signOut() { storeHousehold(null); await supabase.auth.signOut(); }
  return <AuthContext.Provider value={{ loading, profileLoading, session, user: session?.user ?? null, profile, refreshProfile, setActiveHousehold, signInWithGoogle, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error("useAuth must be used within AuthProvider"); return ctx; }
