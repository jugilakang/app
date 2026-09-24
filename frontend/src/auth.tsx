import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { api, AUTH_TOKEN_KEY } from "@/src/api";
import { storage } from "@/src/utils/storage";
import type { Role, Worker } from "@/src/types";

export type Session = { token: string; role: Role; worker: Worker | null };

type AuthContextValue = {
  session: Session | null;
  ready: boolean;
  loginAdmin: (username: string, password: string) => Promise<void>;
  loginWorker: (code: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshWorker: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await storage.secureGet(AUTH_TOKEN_KEY, "");
      if (token) {
        try {
          const me = await api.me();
          setSession({ token, role: me.role, worker: me.worker ?? null });
        } catch {
          await storage.secureRemove(AUTH_TOKEN_KEY);
        }
      }
      setReady(true);
    })();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    ready,
    loginAdmin: async (username, password) => {
      const res = await api.adminLogin(username, password);
      await storage.secureSet(AUTH_TOKEN_KEY, res.access_token);
      setSession({ token: res.access_token, role: "admin", worker: null });
    },
    loginWorker: async (code, pin) => {
      const res = await api.workerLogin(code, pin);
      await storage.secureSet(AUTH_TOKEN_KEY, res.access_token);
      setSession({ token: res.access_token, role: "worker", worker: res.worker });
    },
    logout: async () => {
      await storage.secureRemove(AUTH_TOKEN_KEY);
      setSession(null);
    },
    refreshWorker: async () => {
      const worker = await api.workerMe();
      setSession((current) => (current ? { ...current, worker } : current));
    },
  }), [session, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
