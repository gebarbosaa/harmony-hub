import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  household_id: string | null;
  name: string;
  initials: string | null;
  color: string;
};

type AuthState = {
  loading: boolean;
  profileLoading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  refreshProfile: () => Promise<Profile | null>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  async function loadProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, household_id, name, initials, color")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    const nextProfile = data ?? null;
    setProfile(nextProfile);
    return nextProfile;
  }

  async function refreshProfile(): Promise<Profile | null> {
    if (!session?.user?.id) return profile;
    setProfileLoading(true);
    try {
      return await loadProfile(session.user.id);
    } catch (error) {
      console.error("Failed to refresh profile", error);
      return profile;
    } finally {
      setProfileLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function initialize() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      if (data.session?.user?.id) {
        setProfileLoading(true);
        try {
          await loadProfile(data.session.user.id);
        } catch (error) {
          console.error("Failed to load profile", error);
        } finally {
          if (active) setProfileLoading(false);
        }
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
      if (active) setLoading(false);
    }

    void initialize();

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!active) return;
      setSession(newSession);
      if (event === "SIGNED_OUT" || !newSession) {
        setProfile(null);
        setProfileLoading(false);
        setLoading(false);
        return;
      }
      if (event === "INITIAL_SESSION") return;
      setProfileLoading(true);
      void loadProfile(newSession.user.id)
        .catch((error) => console.error("Failed to load profile after auth change", error))
        .finally(() => {
          if (active) {
            setProfileLoading(false);
            setLoading(false);
          }
        });
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
        scopes: "https://www.googleapis.com/auth/calendar.events",
      },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        loading,
        profileLoading,
        session,
        user: session?.user ?? null,
        profile,
        refreshProfile,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
