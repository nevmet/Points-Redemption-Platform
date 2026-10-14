import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCurrentUser, signIn, signOut } from "@/lib/api";
import type { AppUser } from "@/lib/auth-types";
type Auth = { refreshUser: () => Promise<void>; user: AppUser | null; loading: boolean; login: (username: string, password: string, remember: boolean) => Promise<AppUser>; logout: () => Promise<void> };
const AuthContext = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    getCurrentUser().then((result) => { if (active) setUser(result); }).catch(() => { if (active) setUser(null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <AuthContext.Provider value={{ user, loading, refreshUser: async () => { setUser(await getCurrentUser()); }, login: async (username, password, remember) => { const result = await signIn(username, password, remember); setUser(result); return result; }, logout: async () => { await signOut(); setUser(null); } }}>{children}</AuthContext.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error("AuthProvider is required"); return context; }
