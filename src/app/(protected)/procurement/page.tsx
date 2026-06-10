"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  getPurchaseOrders,
  getProcurementGap,
  createPOFromSuggestions,
  approvePurchaseOrder,
  cancelPurchaseOrder,
  getLocations,
  getAllScorecards,
  computeSupplierScorecard,
  type ApiPurchaseOrder,
  type ApiProcurementSuggestion,
  type ApiLocation,
  type PurchaseOrderStatus,
  type ApiSupplierScorecard,
} from "@/lib/api";
import {
  Plus,
  RefreshCw,
  Loader2,
  ChevronDown,
  Package,
  CheckCircle,
  XCircle,
  ExternalLink,
  ShoppingCart,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const STATUS_STYLES: Record<PurchaseOrderStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  APPROVED: "bg-blue-100 text-blue-700",
  SENT: "bg-purple-100 text-purple-700",
  PARTIALLY_RECEIVED: "bg-amber-100 text-amber-700",
  FULLY_RECEIVED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-red-100 text-red-600",
};

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  SENT: "Sent",
  PARTIALLY_RECEIVED: "Partial",
  FULLY_RECEIVED: "Received",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

const ALL_STATUSES: PurchaseOrderStatus[] = [
  "DRAFT", "APPROVED", "SENT", "PARTIALLY_RECEIVED", "FULLY_RECEIVED", "CLOSED", "CANCELLED",
];

// ── Supplier Scorecard helpers ────────────────────────────────────────────────

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="tabular-nums text-xs font-medium w-9 text-right">{value.toFixed(0)}%</span>
    </div>
  );
}

function overallColor(score: number) {
  if (score >= 80) return "text-emerald-700 bg-emerald-50";
  if (score >= 60) return "text-amber-700 bg-amber-50";
  return "text-red-700 bg-red-50";
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function ProcurementPage() {
  const { can } = useAuth();
  const [tab, setTab] = useState<"orders" | "suggestions" | "suppliers">("orders");
  const [pos, setPos] = useState<ApiPurchaseOrder[]>([]);
  const [suggestions, setSuggestions] = useState<ApiProcurementSuggestion[]>([]);
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [locationId, setLocationId] = useState("");
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | "">("");
  const [loading, setLoading] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [convertingToPO, setConvertingToPO] = useState(false);
  const [scorecards, setScorecards] = useState<ApiSupplierScorecard[]>([]);
  const [scorecardsLoading, setScorecardsLoading] = useState(false);
  const [computingId, setComputingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    getLocations()
      .then((res) => {
        const locs = Array.isArray(res) ? res : (res as any).data ?? [];
        setLocations(locs);
        if (locs.length > 0) setLocationId(locs[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const [poRes, sugRes] = await Promise.all([
          getPurchaseOrders({ status: statusFilter || undefined, locationId: locationId || undefined }),
          locationId ? getProcurementGap(locationId) : Promise.resolve([]),
        ]);
        if (!cancelled) {
          setPos(Array.isArray(poRes) ? poRes : (poRes as any).data ?? []);
          setSuggestions(Array.isArray(sugRes) ? sugRes : []);
        }
      } catch {
        if (!cancelled) toast.error("Failed to load procurement data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [statusFilter, locationId, reloadKey]);

  const loadScorecards = useCallback(async () => {
    setScorecardsLoading(true);
    try {
      const data = await getAllScorecards();
      setScorecards(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load supplier scorecards");
    } finally {
      setScorecardsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "suppliers") loadScorecards();
  }, [tab, loadScorecards]);

  if (!can("inventory:view")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[var(--color-text-secondary)]">
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  const handleComputeScore = async (id: string) => {
    setComputingId(id);
    try {
      const updated = await computeSupplierScorecard(id);
      setScorecards((prev) => prev.map((s) => s.id === id ? updated : s));
      toast.success("Scorecard updated");
    } catch {
      toast.error("Failed to compute scorecard");
    } finally {
      setComputingId(null);
    }
  };

  const reload = () => setReloadKey((k) => k + 1);

  const handleApprove = async (id: string) => {
    try {
      await approvePurchaseOrder(id);
      toast.success("PO approved");
      reload();
    } catch (e: any) {
      toast.error(e.message || "Failed to approve PO");
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this purchase order?")) return;
    try {
      await cancelPurchaseOrder(id);
      toast.success("PO cancelled");
      reload();
    } catch (e: any) {
      toast.error(e.message || "Failed to cancel PO");
    }
  };

  const handleConvertToPO = async () => {
    if (selectedSuggestions.size === 0) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    setConvertingToPO(true);
    try {
      const created = await createPOFromSuggestions({
        suggestionIds: Array.from(selectedSuggestions),
        expectedDate: tomorrow.toISOString().split("T")[0],
      });
      toast.success(`Created ${created.length} purchase order(s)`);
      setSelectedSuggestions(new Set());
      setTab("orders");
      reload();
    } catch (e: any) {
      toast.error(e.message || "Failed to convert suggestions to PO");
    } finally {
      setConvertingToPO(false);
    }
  };

  const pendingSuggestions = suggestions.filter((s) => s.status === "PENDING");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procurement</h1>
          <p className="text-sm text-gray-500 mt-0.5">Purchase orders and goods receiving</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={reload}
            disabled={loading}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 inline-flex items-center gap-1.5"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
          {can("inventory:create") && (
            <Link
              href="/procurement/new"
              className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New PO
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["orders", "suggestions", "suppliers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors",
              tab === t
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-gray-500 hover:text-gray-700",
            )}
          >
            {t === "orders" && <Package className="h-3.5 w-3.5" />}
            {t === "suggestions" && <ShoppingCart className="h-3.5 w-3.5" />}
            {t === "suppliers" && <Star className="h-3.5 w-3.5" />}
            {t === "orders" ? "Purchase Orders" : t === "suggestions" ? "Procurement Suggestions" : "Supplier Scorecard"}
            {t === "suggestions" && pendingSuggestions.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[1rem] text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-1">
                {pendingSuggestions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* PO Filters */}
      {tab === "orders" && (
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="h-9 pl-3 pr-8 border border-gray-200 rounded-lg text-sm bg-white appearance-none focus:outline-none"
            >
              <option value="">All Locations</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-9 pl-3 pr-8 border border-gray-200 rounded-lg text-sm bg-white appearance-none focus:outline-none"
            >
              <option value="">All Statuses</option>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* PO Table */}
      {tab === "orders" && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : pos.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No purchase orders</p>
              <p className="text-sm mt-1">Create a PO manually or convert procurement suggestions.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 font-medium">PO Number</th>
                    <th className="px-4 py-3 font-medium">Supplier</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                    <th className="px-4 py-3 font-medium">Expected</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pos.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/procurement/${po.id}`}
                          className="font-mono font-semibold text-emerald-700 hover:underline"
                        >
                          {po.poNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{po.supplier.name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{po.location?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          STATUS_STYLES[po.status],
                        )}>
                          {STATUS_LABELS[po.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {fmtCurrency(po.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(po.expectedDate)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/procurement/${po.id}`}
                            className="h-7 px-2 border border-gray-200 rounded text-xs hover:bg-gray-50 inline-flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </Link>
                          {can("inventory:edit") && po.status === "DRAFT" && (
                            <button
                              onClick={() => handleApprove(po.id)}
                              className="h-7 px-2 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs hover:bg-blue-100 inline-flex items-center gap-1"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Approve
                            </button>
                          )}
                          {can("inventory:edit") && !["FULLY_RECEIVED", "CLOSED", "CANCELLED"].includes(po.status) && (
                            <button
                              onClick={() => handleCancel(po.id)}
                              className="h-7 px-2 bg-red-50 text-red-600 border border-red-200 rounded text-xs hover:bg-red-100 inline-flex items-center gap-1"
                            >
                              <XCircle className="h-3 w-3" />
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Suppliers / Scorecard Tab */}
      {tab === "suppliers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Supplier performance over the last 90 days · Based on goods receipts
            </p>
            <button
              onClick={loadScorecards}
              disabled={scorecardsLoading}
              className="h-9 px-3 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 inline-flex items-center gap-1.5"
            >
              <RefreshCw className={cn("h-4 w-4", scorecardsLoading && "animate-spin")} />
              Refresh
            </button>
          </div>

          {scorecardsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : scorecards.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Star className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No supplier data yet</p>
              <p className="text-sm mt-1">Scorecards are computed from goods receipt history.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 font-medium">Supplier</th>
                    <th className="px-4 py-3 font-medium">Fill Rate</th>
                    <th className="px-4 py-3 font-medium">On-Time Delivery</th>
                    <th className="px-4 py-3 font-medium">Rejection Rate</th>
                    <th className="px-4 py-3 font-medium text-center">Overall Score</th>
                    <th className="px-4 py-3 font-medium">Last Scored</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {scorecards
                    .sort((a, b) => b.overallScore - a.overallScore)
                    .map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{s.name}</p>
                          {s.email && <p className="text-xs text-gray-400">{s.email}</p>}
                        </td>
                        <td className="px-4 py-3 w-36">
                          <ScoreBar value={s.fillRatePct} color="bg-emerald-500" />
                        </td>
                        <td className="px-4 py-3 w-36">
                          <ScoreBar value={s.onTimeDeliveryRatePct} color="bg-blue-500" />
                        </td>
                        <td className="px-4 py-3 w-36">
                          <ScoreBar value={s.rejectionRatePct} color="bg-red-400" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            "inline-flex items-center justify-center w-12 h-7 rounded-full text-sm font-bold",
                            overallColor(s.overallScore),
                          )}>
                            {s.overallScore.toFixed(0)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {s.lastScoredAt ? fmtDate(s.lastScoredAt) : "Never"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleComputeScore(s.id)}
                            disabled={computingId === s.id}
                            className="h-7 px-2 border border-gray-200 rounded text-xs hover:bg-gray-50 inline-flex items-center gap-1 disabled:opacity-50"
                          >
                            {computingId === s.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <RefreshCw className="h-3 w-3" />}
                            Recompute
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
                Score = Fill Rate ×0.4 + On-Time ×0.3 + (1 − Rejection) ×0.3
              </div>
            </div>
          )}
        </div>
      )}

      {/* Suggestions Tab */}
      {tab === "suggestions" && (
        <div className="space-y-4">
          {/* Location filter for suggestions */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="h-9 pl-3 pr-8 border border-gray-200 rounded-lg text-sm bg-white appearance-none focus:outline-none"
              >
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            {can("inventory:create") && selectedSuggestions.size > 0 && (
              <button
                onClick={handleConvertToPO}
                disabled={convertingToPO}
                className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {convertingToPO
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <ShoppingCart className="h-4 w-4" />}
                Convert {selectedSuggestions.size} to PO
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : pendingSuggestions.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <CheckCircle className="h-10 w-10 mx-auto mb-3 text-emerald-400" />
              <p className="font-medium">No pending suggestions</p>
              <p className="text-sm mt-1">Generate a forecast to see procurement gaps.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={selectedSuggestions.size === pendingSuggestions.length && pendingSuggestions.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSuggestions(new Set(pendingSuggestions.map((s) => s.id)));
                          } else {
                            setSelectedSuggestions(new Set());
                          }
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">Ingredient</th>
                    <th className="px-4 py-3 font-medium text-right">Order Qty</th>
                    <th className="px-4 py-3 font-medium">Supplier</th>
                    <th className="px-4 py-3 font-medium">Needed By</th>
                    <th className="px-4 py-3 font-medium text-right">Est. Cost</th>
                    <th className="px-4 py-3 font-medium max-w-xs">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingSuggestions.map((s) => (
                    <tr key={s.id} className={cn("hover:bg-gray-50", selectedSuggestions.has(s.id) && "bg-emerald-50/50")}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedSuggestions.has(s.id)}
                          onChange={(e) => {
                            const next = new Set(selectedSuggestions);
                            if (e.target.checked) next.add(s.id);
                            else next.delete(s.id);
                            setSelectedSuggestions(next);
                          }}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{s.ingredient.name}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {s.quantityToOrder.toFixed(2)} {s.unit}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{s.suggestedSupplier?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(s.neededByDate)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {s.estimatedCost != null ? fmtCurrency(s.estimatedCost) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{s.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
