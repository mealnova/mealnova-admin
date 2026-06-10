"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Download,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  ShoppingCart,
  Percent,
  Loader2,
} from "lucide-react";
import { getOrders, getLocations, type ApiOrder, type ApiLocation } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────

type ReportPeriod = "7d" | "30d" | "3m" | "6m";

interface MonthBucket {
  month: string;
  revenue: number;
  orders: number;
}

interface LocationBucket {
  name: string;
  value: number;
  color: string;
}

interface ItemBucket {
  name: string;
  orders: number;
  revenue: number;
}

// ── Helpers ────────────────────────────────────────────────

const LOCATION_COLORS = ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#ec4899", "#14b8a6"];

function getDateRange(period: ReportPeriod): { from: string; to: string } {
  const today = new Date();
  const to = today.toISOString().split("T")[0];
  const from = new Date(today);
  if (period === "7d") from.setDate(today.getDate() - 6);
  else if (period === "30d") from.setDate(today.getDate() - 29);
  else if (period === "3m") from.setDate(today.getDate() - 89);
  else from.setDate(today.getDate() - 179);
  return { from: from.toISOString().split("T")[0], to };
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

function buildMonthlyTrend(orders: ApiOrder[]): MonthBucket[] {
  const map: Record<string, MonthBucket> = {};
  for (const o of orders) {
    const key = getMonthKey(o.deliveryDate ?? o.createdAt);
    if (!map[key]) map[key] = { month: key, revenue: 0, orders: 0 };
    map[key].revenue += o.total;
    map[key].orders += 1;
  }
  return Object.values(map).slice(-6);
}

function buildLocationBreakdown(orders: ApiOrder[], locations: ApiLocation[]): LocationBucket[] {
  const map: Record<string, number> = {};
  for (const o of orders) {
    if (!o.location?.name) continue;
    map[o.location.name] = (map[o.location.name] ?? 0) + o.total;
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value], i) => ({ name, value, color: LOCATION_COLORS[i] ?? "#94a3b8" }));
}

function buildTopItems(orders: ApiOrder[]): ItemBucket[] {
  const map: Record<string, ItemBucket> = {};
  for (const o of orders) {
    for (const item of o.items ?? []) {
      if (!map[item.name]) map[item.name] = { name: item.name, orders: 0, revenue: 0 };
      map[item.name].orders += item.quantity;
      map[item.name].revenue += item.total;
    }
  }
  return Object.values(map)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}

// ── Component ──────────────────────────────────────────────

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("30d");
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    const { from, to } = getDateRange(period);
    setIsLoading(true);
    Promise.all([
      getOrders({ dateFrom: from, dateTo: to, pageSize: 500 }),
      getLocations(),
    ])
      .then(([orderRes, locs]) => {
        setOrders(orderRes.data);
        setLocations(locs);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Aggregations ──
  const activeOrders = orders.filter((o) => o.status !== "CANCELLED");
  const totalRevenue = activeOrders.reduce((s, o) => s + o.total, 0);
  const totalOrders = activeOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const monthlyTrend = buildMonthlyTrend(activeOrders);
  const locationBreakdown = buildLocationBreakdown(activeOrders, locations);
  const topItems = buildTopItems(activeOrders);

  // Period label
  const periodLabel: Record<ReportPeriod, string> = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "3m": "Last 3 months",
    "6m": "Last 6 months",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Reports & Analytics</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {isLoading ? "Loading…" : `${totalOrders.toLocaleString()} orders · ${periodLabel[period]}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-surface">
            {(["7d", "30d", "3m", "6m"] as ReportPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition-colors",
                  p === period ? "bg-brand-500 text-white" : "text-text-secondary hover:bg-surface-secondary",
                  p === "7d" && "rounded-l-lg",
                  p === "6m" && "rounded-r-lg"
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-surface-secondary disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isLoading ? "Loading" : "Refresh"}
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            label: `Revenue (${period})`,
            value: isLoading ? "…" : formatCurrency(totalRevenue),
            sub: "total from orders",
            icon: IndianRupee,
            color: "text-brand-600",
            bg: "bg-brand-50",
            trend: null,
          },
          {
            label: `Orders (${period})`,
            value: isLoading ? "…" : totalOrders.toLocaleString(),
            sub: "confirmed orders",
            icon: ShoppingCart,
            color: "text-info-600",
            bg: "bg-info-50",
            trend: null,
          },
          {
            label: "Avg Order Value",
            value: isLoading ? "…" : formatCurrency(avgOrderValue),
            sub: "per order",
            icon: Percent,
            color: "text-success-600",
            bg: "bg-success-50",
            trend: null,
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", kpi.bg)}>
                  <Icon className={cn("h-5 w-5", kpi.color)} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-text-primary">{kpi.value}</p>
              <p className="text-xs text-text-secondary">{kpi.label}</p>
              <p className="text-[11px] text-text-tertiary">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Revenue trend chart */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h3 className="text-sm font-semibold text-text-primary">Revenue by Month</h3>
        {isLoading ? (
          <div className="flex h-56 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
          </div>
        ) : monthlyTrend.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-text-tertiary">
            No data for this period
          </div>
        ) : (
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val: number, name: string) => [formatCurrency(val), name === "revenue" ? "Revenue" : "Orders"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} name="revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Two-column charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Revenue by location */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="text-sm font-semibold text-text-primary">Revenue by Location</h3>
          {isLoading ? (
            <div className="flex h-52 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
            </div>
          ) : locationBreakdown.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-sm text-text-tertiary">No data</div>
          ) : (
            <div className="mt-4 flex items-center gap-4">
              <div className="h-48 w-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={locationBreakdown}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {locationBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {locationBreakdown.map((loc) => (
                  <div key={loc.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: loc.color }} />
                    <div>
                      <p className="text-xs font-medium text-text-primary">{loc.name}</p>
                      <p className="text-xs text-text-tertiary">{formatCurrency(loc.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Orders trend */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="text-sm font-semibold text-text-primary">Order Volume by Month</h3>
          {isLoading ? (
            <div className="flex h-52 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
            </div>
          ) : monthlyTrend.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-sm text-text-tertiary">No data</div>
          ) : (
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(val: number) => [val.toLocaleString(), "Orders"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Line type="monotone" dataKey="orders" stroke="#f97316" strokeWidth={2} dot={{ fill: "#f97316", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Top selling items */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h3 className="text-sm font-semibold text-text-primary">Top Items by Revenue</h3>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-tertiary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : topItems.length === 0 ? (
          <div className="py-10 text-center text-sm text-text-tertiary">No item data for this period</div>
        ) : (
          <div className="mt-4 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Item</th>
                  <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-text-tertiary">Qty Sold</th>
                  <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-text-tertiary">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topItems.map((item, i) => (
                  <tr key={item.name}>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-600">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium text-text-primary">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right text-sm text-text-secondary">{item.orders.toLocaleString()}</td>
                    <td className="py-3 text-right text-sm font-semibold text-text-primary">{formatCurrency(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
