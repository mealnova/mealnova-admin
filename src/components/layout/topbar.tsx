"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Bell, ChevronRight } from "lucide-react";

const pathLabels: Record<string, string> = {
  "/": "Dashboard",
  "/orders": "Meal Orders",
  "/menu": "Menu",
  "/locations": "Locations",
  "/schedule": "Weekly Schedule",
  "/kitchen": "Kitchen Display",
  "/delivery": "Delivery",
  "/accounts": "Accounts",
  "/invoicing": "Invoicing & GST",
  "/inventory": "Inventory",
  "/customers": "Customers",
  "/feedback": "Feedback",
  "/staff": "Staff",
  "/reports": "Reports",
  "/settings": "Settings",
  "/settings/cms-platform": "CMS Platform",
};

const QUICK_LINKS = Object.entries(pathLabels).map(([href, label]) => ({ href, label }));

function getBreadcrumbs(pathname: string) {
  const crumbs = [{ label: "Admin", href: "/" }];
  if (pathname === "/") {
    crumbs.push({ label: "Dashboard", href: "/" });
    return crumbs;
  }
  const segments = pathname.split("/").filter(Boolean);
  let path = "";
  for (const segment of segments) {
    path += `/${segment}`;
    const label = pathLabels[path] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
    crumbs.push({ label, href: path });
  }
  return crumbs;
}

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const crumbs = getBreadcrumbs(pathname);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (event.key === "/" && !isTypingTarget) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSearchSubmit() {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return;
    const target = QUICK_LINKS.find(
      (item) =>
        item.label.toLowerCase().includes(normalized) ||
        item.href.toLowerCase().includes(normalized),
    );
    if (!target) return;
    router.push(target.href);
    setQuery("");
  }

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-surface px-5">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-[13px]">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-text-tertiary" />}
            <span className={i === crumbs.length - 1 ? "font-medium text-text-primary" : "text-text-tertiary"}>
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      {/* Right */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSearchSubmit();
              }
            }}
            placeholder="Jump to page..."
            className="h-8 w-48 rounded-md border border-border bg-surface-secondary pl-8 pr-8 text-[13px] placeholder:text-text-tertiary outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 transition-colors"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-surface-tertiary px-1 py-px text-[10px] text-text-tertiary">
            /
          </kbd>
        </div>

        <button
          onClick={() => router.push("/feedback")}
          aria-label="Open feedback queue"
          className="relative flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-secondary transition-colors hover:bg-surface-secondary"
        >
          <Bell className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
