import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

type AdminAuthStatus = "checking" | "authenticated" | "anonymous";

interface AdminAuthContextValue {
  status: AdminAuthStatus;
  isAdmin: boolean;
  login: (password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

async function readAdminStatus() {
  const response = await fetch("/api/admin/me", {
    credentials: "include",
    cache: "no-store"
  });

  if (!response.ok) {
    return false;
  }

  const data = (await response.json()) as { authenticated?: boolean };
  return Boolean(data.authenticated);
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AdminAuthStatus>("checking");

  const refresh = useCallback(async () => {
    try {
      const authenticated = await readAdminStatus();
      setStatus(authenticated ? "authenticated" : "anonymous");
    } catch {
      setStatus("anonymous");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (password: string) => {
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password })
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setStatus("anonymous");
        return {
          ok: false as const,
          error: data?.error ?? "관리자 로그인에 실패했습니다."
        };
      }

      setStatus("authenticated");
      return { ok: true as const };
    } catch {
      setStatus("anonymous");
      return {
        ok: false as const,
        error: "관리자 인증 API 연결을 확인해야 합니다."
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store"
      });
    } finally {
      setStatus("anonymous");
    }
  }, []);

  const value = useMemo(
    () => ({
      status,
      isAdmin: status === "authenticated",
      login,
      logout,
      refresh
    }),
    [login, logout, refresh, status]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }

  return context;
}
