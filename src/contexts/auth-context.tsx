"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AuthServiceUnavailableError,
  clearCachedSession,
  getSession,
  logoutAction,
  readCachedSession,
} from "@/lib/auth";
import { hasPermission, type Permission, type Role, type RoleMeta, ROLE_META } from "@/lib/rbac";

export type { Role };

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  can: (permission: Permission) => boolean;
  roleMeta: RoleMeta;
  refreshSession: () => Promise<AuthUser | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  can: () => false,
  roleMeta: ROLE_META["SUPER_ADMIN"],
  refreshSession: async () => null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/change-password");

  useEffect(() => {
    let mounted = true;

    getSession()
      .then((session) => {
        if (!mounted) return;
        if (!session) {
          setUser(null);
          if (!isAuthRoute) {
            router.replace("/login");
          }
          return;
        }
        setUser(session as AuthUser);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        const cachedUser = readCachedSession();
        if (error instanceof AuthServiceUnavailableError && cachedUser) {
          setUser(cachedUser as AuthUser);
          return;
        }
        clearCachedSession();
        setUser(null);
        if (!isAuthRoute) {
          router.replace("/login");
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isAuthRoute, pathname, router]);

  const can = (permission: Permission) => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  };

  const refreshSession = async () => {
    const session = await getSession();
    const nextUser = (session as AuthUser | null) ?? null;
    setUser(nextUser);
    return nextUser;
  };

  const signOut = async () => {
    try {
      await logoutAction();
    } finally {
      setUser(null);
      clearCachedSession();
      router.replace("/login");
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      can,
      roleMeta: ROLE_META[user?.role ?? "SUPER_ADMIN"],
      refreshSession,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
