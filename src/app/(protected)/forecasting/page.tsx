"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import {
  getLocations,
  generateForecast,
  getDemandForDate,
  getProcurementGap,
  type ApiLocation,
  type ApiDemandForecast,
  type ApiProcurementSuggestion,
} from "@/lib/api";
import {
  TrendingUp,
  RefreshCw,
  Loader2,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── helpers ──────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const SLOT_LABELS: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  SNACKS: "Snacks",
  DINNER: "Dinner",
};

function GapBadge({ gap }: { gap: number }) {
  if (gap <= 0) return <span className="text-xs font-semibold text-emerald-600">Sufficient</span>;
  if (gap < 5) return <span className="text-xs font-semibold text-amber-600">Low gap</span>;
  return <span className="text-xs font-semibold text-red-600">Shortage</span>;
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function ForecastingPage() {
  const { can } = useAuth();
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [locationId, setLocationId] = useState("");
  const [date, setDate] = useState(today());
  const [forecasts, setForecasts] = useState<ApiDemandForecast[]>([]);
  const [suggestions, setSuggestions] = useState<ApiProcurementSuggestion[]>([]);
  const [tab, setTab] = useState<"demand" | "procurement">("demand");
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    getLocations()
      .then((res) => {
        const locs = Array.isArray(res) ? res : (res as any).data ?? [];
        setLocations(locs);
        if (locs.length > 0) setLocationId(locs[0].id);
      })
      .catch(() => toast.error("Failed to load locations"));
  }, []);

  useEffect(() => {
    if (!locationId) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const [dem, sug] = await Promise.all([
          getDemandForDate(locationId, date),
          getProcurementGap(locationId),
        ]);
        if (!cancelled) setForecasts(dem);
        if (!cancelled) setSuggestions(sug);
      } catch {
        if (!cancelled) toast.error("Failed to load forecast data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [locationId, date, reloadKey]);

  if (!can("reports:view")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[var(--color-text-secondary)]">
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  async function handleGenerate() {
    if (!locationId) return;
    setGenerating(true);
    try {
      const res = await generateForecast(locationId, 3);
      toast.success(`Generated ${res.generated} forecast slots`);
      setReloadKey((k) => k + 1);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate forecast");
    } finally {
      setGenerating(false);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demand Forecasting</h1>
          <p className="text-sm text-gray-500 mt-0.5">BOM-based ingredient demand and procurement gaps</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || !locationId}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
          Generate Forecast (3 days)
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="h-9 pl-3 pr-8 border border-gray-200 rounded-lg text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          disabled={loading}
          className="h-9 px-3 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 inline-flex items-center gap-1.5"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["demand", "procurement"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors",
              tab === t
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-gray-500 hover:text-gray-700",
            )}
          >
            {t === "demand" ? "Ingredient Demand" : "Procurement Gaps"}
            {t === "procurement" && suggestions.filter((s) => s.status === "PENDING").length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[1rem] text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-1">
                {suggestions.filter((s) => s.status === "PENDING").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Demand tab */}
      {tab === "demand" && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : forecasts.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No forecast for {fmtDate(date)}</p>
              <p className="text-sm mt-1">Click "Generate Forecast" to run BOM explosion.</p>
            </div>
          ) : (
            forecasts.map((f) => (
              <div key={f.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-900">
                    {SLOT_LABELS[f.mealSlot] ?? f.mealSlot}
                  </span>
                  <span className="text-xs text-gray-500">
                    {f.expectedCovers} covers expected
                    {f.actualCovers != null && ` · Actual: ${f.actualCovers}`}
                  </span>
                </div>
                {f.ingredientDemands.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-gray-400 text-center">
                    No recipe data — add recipes to menu items to see ingredient demand.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                        <th className="px-4 py-2 font-medium">Ingredient</th>
                        <th className="px-4 py-2 font-medium text-right">Needed</th>
                        <th className="px-4 py-2 font-medium text-right">In Stock</th>
                        <th className="px-4 py-2 font-medium text-right">Gap</th>
                        <th className="px-4 py-2 font-medium text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {f.ingredientDemands.map((d) => (
                        <tr key={d.id} className={cn("hover:bg-gray-50", d.gap > 0 && "bg-red-50/40")}>
                          <td className="px-4 py-2.5 font-medium text-gray-900">
                            {d.ingredient.name}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-700">
                            {d.quantityNeeded.toFixed(2)} {d.unit}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-700">
                            {d.currentStock.toFixed(2)} {d.unit}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium">
                            {d.gap > 0 ? (
                              <span className="text-red-600">{d.gap.toFixed(2)} {d.unit}</span>
                            ) : (
                              <span className="text-emerald-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <GapBadge gap={d.gap} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Procurement gaps tab */}
      {tab === "procurement" && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <CheckCircle className="h-10 w-10 mx-auto mb-3 text-emerald-400" />
              <p className="font-medium">No procurement gaps</p>
              <p className="text-sm mt-1">All ingredients are sufficiently stocked.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                    <th className="px-4 py-3 font-medium">Ingredient</th>
                    <th className="px-4 py-3 font-medium text-right">Order Qty</th>
                    <th className="px-4 py-3 font-medium">Supplier</th>
                    <th className="px-4 py-3 font-medium">Needed By</th>
                    <th className="px-4 py-3 font-medium">Est. Cost</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {suggestions.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <Package className="h-3.5 w-3.5 text-gray-400" />
                          {s.ingredient.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {s.quantityToOrder.toFixed(2)} {s.unit}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {s.suggestedSupplier?.name ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {fmtDate(s.neededByDate)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {s.estimatedCost != null
                          ? `₹${s.estimatedCost.toFixed(0)}`
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          s.status === "PENDING" && "bg-amber-100 text-amber-700",
                          s.status === "APPROVED" && "bg-blue-100 text-blue-700",
                          s.status === "CONVERTED_TO_PO" && "bg-emerald-100 text-emerald-700",
                          s.status === "DISMISSED" && "bg-gray-100 text-gray-500",
                        )}>
                          {s.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                        {s.reason}
                      </td>
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
