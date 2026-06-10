"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import { ArrowUpRight, Plus, Eye, FileText, Loader2, UtensilsCrossed, MapPin, ShoppingCart, TrendingUp } from "lucide-react";
import { getLocations, getMenuItems, getOrders, getInvoices } from "@/lib/api";

// ── Component ──────────────────────────────────────────────

export default function DashboardPage() {
  const [menuCount, setMenuCount] = useState<number | null>(null);
  const [locationCount, setLocationCount] = useState<number | null>(null);
  const [ordersToday, setOrdersToday] = useState<number | null>(null);
  const [revenueToday, setRevenueToday] = useState<number | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [revenueChart, setRevenueChart] = useState<{ day: string; revenue: number }[]>([]);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  useEffect(() => {
    // Locations count
    getLocations()
      .then((locs) => setLocationCount(locs.filter((l) => l.isActive).length))
      .catch(() => setLocationCount(0));

    // Menu items count (total catalog)
    getMenuItems({ })
      .then((res) => setMenuCount(res.total))
      .catch(() => setMenuCount(0));

    // Today's orders
    getOrders({ dateFrom: todayStr, dateTo: todayStr, pageSize: 50 })
      .then((res) => {
        setOrdersToday(res.total);
        setRevenueToday(res.data.reduce((s, o) => s + o.total, 0));
        setRecentOrders(res.data.slice(0, 5));
      })
      .catch(() => {
        setOrdersToday(0);
        setRevenueToday(0);
        setRecentOrders([]);
      });

    // Last 7 days revenue for chart
    const days: { day: string; revenue: number }[] = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const promises = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const ds = d.toISOString().split("T")[0];
      return getOrders({ dateFrom: ds, dateTo: ds, pageSize: 200 })
        .then((res) => ({ day: dayNames[d.getDay()], revenue: res.data.reduce((s, o) => s + o.total, 0) }))
        .catch(() => ({ day: dayNames[d.getDay()], revenue: 0 }));
    });
    Promise.all(promises).then(setRevenueChart);
  }, []);

  const dateLabel = today.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const kpis = [
    {
      label: "Menu Items",
      value: menuCount === null ? "…" : String(menuCount),
      sub: "in active catalog",
      icon: UtensilsCrossed,
      color: "text-brand-600",
      bg: "bg-brand-50",
    },
    {
      label: "Service Locations",
      value: locationCount === null ? "…" : String(locationCount),
      sub: "across Pune",
      icon: MapPin,
      color: "text-info-600",
      bg: "bg-info-50",
    },
    {
      label: "Orders Today",
      value: ordersToday === null ? "…" : String(ordersToday),
      sub: todayStr,
      icon: ShoppingCart,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Today's Revenue",
      value: revenueToday === null ? "…" : formatCurrency(revenueToday),
      sub: "from today's orders",
      icon: TrendingUp,
      color: "text-success-600",
      bg: "bg-success-50",
    },
  ];

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Dashboard</h1>
          <p className="text-[13px] text-text-tertiary">{dateLabel}</p>
        </div>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-500 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-600"
        >
          <Plus className="h-3.5 w-3.5" />
          New Order
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex items-start justify-between">
                <p className="text-[12px] font-medium text-text-tertiary">{kpi.label}</p>
                <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", kpi.bg)}>
                  <Icon className={cn("h-3.5 w-3.5", kpi.color)} />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-text-primary">
                {kpi.value === "…" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
                ) : (
                  kpi.value
                )}
              </p>
              <p className="mt-0.5 text-[12px] text-text-tertiary">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="col-span-2 rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-text-primary">Revenue</p>
              <p className="text-[12px] text-text-tertiary">Last 7 days</p>
            </div>
            <span className="rounded-md border border-border px-2.5 py-1 text-[12px] text-text-secondary">This week</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => v === 0 ? "₹0" : `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val: number) => [formatCurrency(val), "Revenue"]}
                  contentStyle={{ borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: "#f97316" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-[13px] font-semibold text-text-primary mb-3">Quick actions</p>
          <div className="space-y-2">
            {[
              { href: "/menu", icon: Plus, label: "Add menu item", sub: "Update location menu" },
              { href: "/orders", icon: Eye, label: "View orders", sub: "Monitor live board" },
              { href: "/invoicing", icon: FileText, label: "Generate invoice", sub: "GST-compliant PDF" },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center gap-3 rounded-md border border-border px-3 py-2 transition-colors hover:border-brand-200 hover:bg-brand-50"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                  <div>
                    <p className="text-[12px] font-medium text-text-primary">{a.label}</p>
                    <p className="text-[11px] text-text-tertiary">{a.sub}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Live stats */}
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-[12px] font-semibold text-text-primary mb-2">Live Stats</p>
            <dl className="space-y-2">
              {[
                { label: "Menu items", value: menuCount === null ? "…" : String(menuCount) },
                { label: "Locations", value: locationCount === null ? "…" : String(locationCount) },
                { label: "Orders today", value: ordersToday === null ? "…" : String(ordersToday) },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <dt className="text-[12px] text-text-tertiary">{row.label}</dt>
                  <dd className="text-[13px] font-semibold text-text-primary">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-[13px] font-semibold text-text-primary">Recent Orders</p>
          <Link href="/orders" className="text-[12px] font-medium text-brand-600 hover:text-brand-700">
            View all
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShoppingCart className="h-8 w-8 text-text-tertiary mb-3" />
            <p className="text-sm font-medium text-text-secondary">No orders today</p>
            <p className="mt-1 text-xs text-text-tertiary">
              Orders placed today will appear here.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                {["Order #", "Customer", "Location", "Total", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-surface-secondary">
                  <td className="px-4 py-2.5 text-xs font-semibold text-brand-600">{order.orderNumber}</td>
                  <td className="px-4 py-2.5 text-xs text-text-primary">{order.customer?.name}</td>
                  <td className="px-4 py-2.5 text-xs text-text-secondary">{order.location?.name}</td>
                  <td className="px-4 py-2.5 text-xs font-medium text-text-primary">{formatCurrency(order.total)}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      order.status === "DELIVERED" ? "bg-success-50 text-success-700"
                        : order.status === "CANCELLED" ? "bg-danger-50 text-danger-700"
                        : "bg-brand-50 text-brand-700"
                    )}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
