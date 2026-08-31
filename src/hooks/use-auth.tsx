import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = { id: string; household_id: string | null; name: string; initials: string | null; color: string };
type AuthState = { loading: boolean; profileLoading: boolean; session: Session | null; user: User | null; profile: Profile | null; refreshProfile: () => Promise<Profile | null>; signInWithGoogle: () => Promise<void>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const profileRequestRef = useRef(0);

  async function loadProfile(userId: string): Promise<Profile | null> {
    const requestId = ++profileRequestRef.current;
    const { data, error } = await supabase.from("profiles").select("id, household_id, name, initials, color").eq("id", userId).maybeSingle();
    if (error) throw error;
    if (requestId !== profileRequestRef.current || sessionRef.current?.user.id !== userId) return profile;
    const nextProfile = data ?? null;
    setProfile(nextProfile);
    return nextProfile;
  }

  async function refreshProfile() {
    const current = sessionRef.current;
    if (!current?.user?.id) return profile;
    setProfileLoading(true);
    try { return await loadProfile(current.user.id); }
    catch (error) { console.error("Failed to refresh profile", error); return profile; }
    finally { if (sessionRef.current?.user.id === current.user.id) setProfileLoading(false); }
  }

  useEffect(() => {
    let active = true;
    const applySession = async (nextSession: Session | null) => {
      if (!active) return;
      sessionRef.current = nextSession;
      setSession(nextSession);
      if (!nextSession) { ++profileRequestRef.current; setProfile(null); setProfileLoading(false); setLoading(false); return; }
      setProfileLoading(true);
      try { await loadProfile(nextSession.user.id); }
      catch (error) { if (active) console.error("Failed to load profile", error); }
      finally { if (active && sessionRef.current?.user.id === nextSession.user.id) { setProfileLoading(false); setLoading(false); } }
    };

    void supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      if (event === "INITIAL_SESSION") return;
      if (event === "SIGNED_OUT") { void applySession(null); return; }
      void applySession(nextSession);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function signInWithGoogle() { await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { access_type: "offline", prompt: "consent" }, scopes: "https://www.googleapis.com/auth/calendar.events" } }); }
  async function signOut() { await supabase.auth.signOut(); }

  return <AuthContext.Provider value={{ loading, profileLoading, session, user: session?.user ?? null, profile, refreshProfile, signInWithGoogle, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error("useAuth must be used within AuthProvider"); return ctx; }
