"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { ROLE_META } from "@/lib/rbac";
import type { Permission } from "@/lib/rbac";
import { useBrandSettings } from "@/lib/hooks/use-brand-settings";
import {
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  MapPin,
  CalendarDays,
  Monitor,
  Truck,
  Building2,
  FileText,
  Package,
  Users,
  MessageSquare,
  UserCog,
  BarChart3,
  Settings,
  LogOut,
  ChefHat,
  Shield,
  Palette,
  FlaskConical,
  GitBranch,
  Image as Image2,
  BookOpen,
  HelpCircle,
  Star,
  Briefcase,
  Layers,
  CalendarCheck,
  Tag,
  Globe,
  Soup,
  Salad,
  TrendingUp,
  ClipboardList,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  permission: Permission;
}

const navGroups: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { label: "Dashboard",      href: "/",          icon: LayoutDashboard, permission: "dashboard:view" },
      { label: "Meal Orders",    href: "/orders",    icon: ShoppingCart,    badge: 3, permission: "orders:view" },
      { label: "Menu",           href: "/menu",      icon: UtensilsCrossed, permission: "menu:view" },
      { label: "Meal Packages", href: "/meal-packages", icon: Salad, permission: "menu:view" },
      { label: "Locations",      href: "/locations", icon: MapPin,          permission: "locations:view" },
    ],
  },
  {
    items: [
      { label: "Weekly Schedule", href: "/schedule",           icon: CalendarDays,  permission: "schedule:view" },
      { label: "Kitchen Display", href: "/kitchen",            icon: Monitor,       permission: "kitchen:view" },
      { label: "Prep Sheet",      href: "/kitchen/prep-sheet", icon: Soup,          permission: "kitchen:view" },
      { label: "Forecasting",     href: "/forecasting",        icon: TrendingUp,    permission: "reports:view" },
      { label: "Delivery",        href: "/delivery",           icon: Truck,         permission: "delivery:view" },
    ],
  },
  {
    items: [
      { label: "Accounts",       href: "/accounts",    icon: Building2,     permission: "accounts:view" },
      { label: "Events",         href: "/events",      icon: CalendarCheck, permission: "accounts:view" },
      { label: "Invoicing & GST",href: "/invoicing",   icon: FileText,      permission: "invoicing:view" },
      { label: "Inventory",      href: "/inventory",   icon: Package,       permission: "inventory:view" },
      { label: "Procurement",    href: "/procurement", icon: ClipboardList, permission: "inventory:view" },
    ],
  },
  {
    items: [
      { label: "Customers",      href: "/customers",        icon: Users,         permission: "customers:view" },
      { label: "Feedback",       href: "/feedback",         icon: MessageSquare, permission: "feedback:view" },
      { label: "Staff",          href: "/staff",            icon: UserCog,       permission: "staff:view" },
      { label: "Reports",        href: "/reports",          icon: BarChart3,     permission: "reports:view" },
      { label: "Brand Settings", href: "/settings/brand",   icon: Palette,       permission: "settings:view" },
      { label: "Themes",          href: "/settings/themes",  icon: Palette,       permission: "settings:view" },
      { label: "A/B Testing",     href: "/settings/experiments", icon: FlaskConical, permission: "settings:view" },
      { label: "CMS Platform",   href: "/settings/cms-platform", icon: GitBranch, permission: "settings:view" },
      { label: "User Mgmt",      href: "/settings/users",   icon: Shield,        permission: "settings:view" },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Gallery",       href: "/content/gallery",       icon: Image2,          permission: "settings:view" },
      { label: "Pages",         href: "/content/pages",         icon: FileText,        permission: "settings:view" },
      { label: "Blog",          href: "/content/blog",          icon: BookOpen,        permission: "settings:view" },
      { label: "FAQs",          href: "/content/faqs",          icon: HelpCircle,      permission: "settings:view" },
      { label: "Testimonials",  href: "/content/testimonials",  icon: Star,            permission: "settings:view" },
      { label: "Careers",       href: "/content/careers",       icon: Briefcase,       permission: "settings:view" },
      { label: "Client Logos",  href: "/content/client-logos",  icon: Globe,           permission: "settings:view" },
      { label: "Services",      href: "/content/services",      icon: Layers,          permission: "settings:view" },
      { label: "Event Types",   href: "/content/event-types",   icon: CalendarCheck,   permission: "settings:view" },
      { label: "Cuisines",      href: "/content/cuisines",      icon: Soup,            permission: "settings:view" },
      { label: "Pricing",       href: "/content/pricing",       icon: Tag,             permission: "settings:view" },
      { label: "Assets",        href: "/content/assets",        icon: Image2,          permission: "settings:view" },
      { label: "Taxonomies",    href: "/content/taxonomies",    icon: Tag,             permission: "settings:view" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname() ?? "/";
  const { user, can, signOut } = useAuth();
  const { data: brand } = useBrandSettings();
  const siteName = brand?.siteName ?? "";

  const actualRole = user?.role ?? "SUPER_ADMIN";
  const actualMeta = ROLE_META[actualRole];

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "HC";

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col border-r border-border bg-sidebar">

      {/* Wordmark */}
      <div className="flex h-14 items-center gap-2.5 px-5 border-b border-border">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-brand-500">
          <ChefHat className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-[13px] font-semibold tracking-tight text-text-primary truncate">
          {siteName}
        </span>
      </div>

      {/* Role badge */}
      <div className="px-3 py-2 border-b border-border">
        <div className={cn("flex items-center gap-1.5 rounded-md px-2 py-1", actualMeta.bg)}>
          <Shield className={cn("h-3 w-3 shrink-0", actualMeta.color)} />
          <span className={cn("text-[11px] font-semibold truncate", actualMeta.color)}>
            {actualMeta.label}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {navGroups.map((group, gi) => {
          const visibleItems = group.items.filter((item) => {
            if (
              item.href === "/settings/users" ||
              item.href === "/settings/cms-platform"
            ) {
              return user?.role === "SUPER_ADMIN";
            }
            return can(item.permission);
          });
          if (visibleItems.length === 0) return null;
          return (
            <div key={gi}>
              {gi > 0 && <div className="my-1 mx-4 border-t border-border-light" />}
              {group.label && (
                <p className="px-4 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                  {group.label}
                </p>
              )}
              <ul className="px-2 py-0.5 space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors border-l-2",
                          active
                            ? "border-l-brand-500 bg-brand-50 text-brand-700 font-medium"
                            : "border-l-transparent text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active"
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-brand-600" : "text-sidebar-text")} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge !== undefined && (
                          <span className={cn(
                            "flex h-4 min-w-4 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                            active
                              ? "bg-brand-200 text-brand-700"
                              : "bg-surface-tertiary text-text-tertiary"
                          )}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      {can("settings:view") && (
        <div className="px-2 pb-1">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors border-l-2",
              isActive("/settings")
                ? "border-l-brand-500 bg-brand-50 text-brand-700 font-medium"
                : "border-l-transparent text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active"
            )}
          >
            <Settings className={cn("h-4 w-4 shrink-0", isActive("/settings") ? "text-brand-600" : "text-sidebar-text")} />
            <span>Settings</span>
          </Link>
        </div>
      )}

      {/* User footer */}
      <div className="border-t border-border px-3 py-3 relative">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[12px] font-bold text-brand-700">
            {initials}
          </div>
          <div className="flex flex-1 min-w-0 flex-col items-start">
            <p className="truncate text-[13px] font-medium text-text-primary w-full">
              {user?.name ?? "Loading…"}
            </p>
            <span className={cn("flex items-center gap-0.5 text-[11px] font-semibold", actualMeta.color)}>
              {actualMeta.label}
            </span>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="text-text-tertiary hover:text-danger-600 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
