"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import type { Permission } from "@/lib/rbac";

const ROUTE_PERMISSIONS: Array<{ prefix: string; permission: Permission }> = [
  { prefix: "/content", permission: "settings:view" },
  { prefix: "/settings", permission: "settings:view" },
  { prefix: "/meal-packages", permission: "menu:view" },
  { prefix: "/menu", permission: "menu:view" },
  { prefix: "/locations", permission: "locations:view" },
  { prefix: "/schedule", permission: "schedule:view" },
  { prefix: "/kitchen", permission: "kitchen:view" },
  { prefix: "/delivery", permission: "delivery:view" },
  { prefix: "/accounts", permission: "accounts:view" },
  { prefix: "/invoicing", permission: "invoicing:view" },
  { prefix: "/inventory", permission: "inventory:view" },
  { prefix: "/customers", permission: "customers:view" },
  { prefix: "/feedback", permission: "feedback:view" },
  { prefix: "/staff", permission: "staff:view" },
  { prefix: "/reports", permission: "reports:view" },
  { prefix: "/orders", permission: "orders:view" },
  { prefix: "/", permission: "dashboard:view" },
];

const FALLBACK_ROUTES: Array<{ href: string; permission: Permission }> = [
  { href: "/", permission: "dashboard:view" },
  { href: "/orders", permission: "orders:view" },
  { href: "/menu", permission: "menu:view" },
  { href: "/locations", permission: "locations:view" },
  { href: "/schedule", permission: "schedule:view" },
  { href: "/kitchen", permission: "kitchen:view" },
  { href: "/delivery", permission: "delivery:view" },
  { href: "/accounts", permission: "accounts:view" },
  { href: "/invoicing", permission: "invoicing:view" },
  { href: "/inventory", permission: "inventory:view" },
  { href: "/customers", permission: "customers:view" },
  { href: "/feedback", permission: "feedback:view" },
  { href: "/staff", permission: "staff:view" },
  { href: "/reports", permission: "reports:view" },
  { href: "/settings", permission: "settings:view" },
];

function permissionForPath(pathname: string): Permission {
  return (
    ROUTE_PERMISSIONS.find(
      (entry) => entry.prefix === "/" ? pathname === "/" : pathname.startsWith(entry.prefix),
    )?.permission ?? "dashboard:view"
  );
}

export function RoutePermissionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { can, isLoading, user } = useAuth();
  const requiresSuperAdmin =
    pathname.startsWith("/settings/users") || pathname.startsWith("/settings/cms-platform");

  const requiredPermission = useMemo(() => permissionForPath(pathname), [pathname]);
  const allowed = requiresSuperAdmin
    ? user?.role === "SUPER_ADMIN"
    : can(requiredPermission);
  const fallbackHref = useMemo(
    () => FALLBACK_ROUTES.find((route) => can(route.permission))?.href ?? "/login",
    [can],
  );

  useEffect(() => {
    if (!isLoading && !allowed) {
      router.replace(fallbackHref);
    }
  }, [allowed, fallbackHref, isLoading, router]);

  if (isLoading || !allowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-text-tertiary">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking access…
      </div>
    );
  }

  return <>{children}</>;
}
