"use client";

import { useState, useEffect } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import {
  getWasteLogs,
  getLocations,
  type ApiWasteLog,
} from "@/lib/api";
import {
  Trash2,
  Filter,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

// ── Reason colours ────────────────────────────────────────────────────────

const REASON_COLOR: Record<string, string> = {
  OVERPRODUCTION: "bg-blue-100 text-blue-700",
  SPOILAGE:       "bg-red-100 text-red-700",
  PREP_LOSS:      "bg-yellow-100 text-yellow-700",
  CUSTOMER_RETURN:"bg-purple-100 text-purple-700",
};

function ReasonBadge({ reason }: { reason: string }) {
  return (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", REASON_COLOR[reason] ?? "bg-gray-100 text-gray-600")}>
      {reason.replace(/_/g, " ")}
    </span>
  );
}

// ── Summary cards ─────────────────────────────────────────────────────────

function SummaryCards({ logs }: { logs: ApiWasteLog[] }) {
  const totalCost = logs.reduce((s, l) => s + l.costImpact, 0);
  const byReason: Record<string, { count: number; cost: number }> = {};

  for (const log of logs) {
    if (!byReason[log.reason]) byReason[log.reason] = { count: 0, cost: 0 };
    byReason[log.reason].count++;
    byReason[log.reason].cost += log.costImpact;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-[var(--color-surface-dark)] text-white p-4">
          <p className="text-xs text-white/60">Total Waste Cost</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalCost)}</p>
          <p className="text-xs text-white/50 mt-0.5">{logs.length} incidents</p>
        </div>
        {Object.entries(byReason)
          .sort((a, b) => b[1].cost - a[1].cost)
          .slice(0, 3)
          .map(([reason, data]) => (
            <div key={reason} className="rounded-xl border bg-[var(--color-surface-card)] p-4">
              <ReasonBadge reason={reason} />
              <p className="text-xl font-bold mt-2 text-[var(--color-text-primary)]">
                {formatCurrency(data.cost)}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                {data.count} incident{data.count !== 1 ? "s" : ""}
              </p>
            </div>
          ))}
      </div>

      {/* By-reason bar chart (CSS only) */}
      {Object.keys(byReason).length > 0 && (
        <div className="rounded-xl border bg-white p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Cost by Reason</h3>
          {Object.entries(byReason)
            .sort((a, b) => b[1].cost - a[1].cost)
            .map(([reason, data]) => {
              const pct = totalCost > 0 ? (data.cost / totalCost) * 100 : 0;
              return (
                <div key={reason} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--color-text-secondary)]">
                      {reason.replace(/_/g, " ")}
                    </span>
                    <span className="tabular-nums font-medium">{formatCurrency(data.cost)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--color-primary-500)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgoStr() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export default function WasteReportPage() {
  const { can } = useAuth();
  const [logs, setLogs] = useState<ApiWasteLog[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [locationId, setLocationId] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgoStr());
  const [dateTo, setDateTo] = useState(todayStr());

  const load = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const [result, locs] = await Promise.all([
        getWasteLogs({ locationId: locationId || undefined, reason: reasonFilter || undefined, dateFrom, dateTo }),
        getLocations(),
      ]);
      setLogs(result.data ?? []);
      setLocations(locs);
    } catch {
      toast.error("Failed to load waste logs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [locationId, reasonFilter, dateFrom, dateTo]);

  if (!can("reports:view")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[var(--color-text-secondary)]">
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
            Waste Report
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Track food waste by reason, ingredient, and cost impact
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
        >
          <option value="">All Locations</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
        >
          <option value="">All Reasons</option>
          {["OVERPRODUCTION", "SPOILAGE", "PREP_LOSS", "CUSTOMER_RETURN"].map((r) => (
            <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]" />
        <span className="text-gray-400 text-sm">to</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]" />
      </div>

      {loading ? (
        <div className="text-center py-16 text-[var(--color-text-secondary)]">Loading…</div>
      ) : (
        <>
          {/* Summary */}
          {logs.length > 0 && <SummaryCards logs={logs} />}

          {/* Table */}
          <div className="rounded-xl border overflow-hidden bg-white">
            {logs.length === 0 ? (
              <div className="text-center py-16 text-[var(--color-text-secondary)]">
                <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No waste logs for this period</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--color-surface)] border-b text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-left">Reason</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Cost Impact</th>
                    <th className="px-4 py-3 text-center">Stock Deducted</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {new Date(log.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                        {log.ingredient?.name ?? log.itemName}
                        <p className="text-xs text-[var(--color-text-secondary)] font-normal">{log.itemName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <ReasonBadge reason={log.reason} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {log.quantity} {log.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-red-600">
                        {formatCurrency(log.costImpact)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {log.stockMovementId ? (
                          <span className="text-xs text-emerald-600 font-medium">Yes</span>
                        ) : (
                          <span className="text-xs text-gray-400">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
