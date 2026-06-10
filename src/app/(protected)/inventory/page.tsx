"use client";

import { useState, useEffect } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import {
  getInventory,
  getLocations,
  createInventoryItem,
  adjustInventoryStock,
  deleteInventoryItem,
  getReconciliationLogs,
  triggerReconciliation,
  createWasteLog,
  type ApiInventoryItem,
  type ApiLocation,
  type ApiStockReconciliationLog,
} from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import {
  Search, Plus, AlertTriangle, Package, Loader2, ShoppingCart, X, TrendingUp, TrendingDown, Trash2, History, RefreshCw, Flame,
} from "lucide-react";
import { StockMovementPanel } from "./stock-movement-panel";

// ── Stock level helper ────────────────────────────────────────────────────────

type StockLevel = "good" | "low" | "critical" | "out";

function getStockLevel(current: number, reorder: number): StockLevel {
  if (current === 0) return "out";
  if (current < reorder * 0.5) return "critical";
  if (current <= reorder) return "low";
  return "good";
}

const STOCK_CONFIG: Record<StockLevel, { label: string; bar: string; text: string; bg: string }> = {
  good:     { label: "Good",         bar: "bg-success-500", text: "text-success-700", bg: "bg-success-50" },
  low:      { label: "Low",          bar: "bg-warning-500", text: "text-warning-700", bg: "bg-warning-50" },
  critical: { label: "Critical",     bar: "bg-danger-500",  text: "text-danger-700",  bg: "bg-danger-50" },
  out:      { label: "Out of Stock", bar: "bg-danger-600",  text: "text-danger-700",  bg: "bg-danger-50" },
};

function StockBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  const level = getStockLevel(current, max * 0.2);
  return (
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-border">
      <div className={cn("h-full rounded-full transition-all", STOCK_CONFIG[level].bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Modal: Add Inventory Item ─────────────────────────────────────────────────

function AddItemModal({
  locations,
  onClose,
  onSaved,
}: {
  locations: ApiLocation[];
  onClose: () => void;
  onSaved: (item: ApiInventoryItem) => void;
}) {
  const [form, setForm] = useState({
    ingredientName: "",
    unit: "kg",
    locationId: locations[0]?.id ?? "",
    currentStock: "",
    reorderPoint: "",
    maxStock: "",
    costPerUnit: "",
    isPerishable: false,
    supplierName: "",
  });
  const [saving, setSaving] = useState(false);

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.ingredientName.trim() || !form.locationId) {
      toast.error("Ingredient name and location are required");
      return;
    }
    setSaving(true);
    try {
      const item = await createInventoryItem({
        ingredientName: form.ingredientName.trim(),
        unit: form.unit,
        locationId: form.locationId,
        currentStock: parseFloat(form.currentStock) || 0,
        reorderPoint: parseFloat(form.reorderPoint) || 0,
        maxStock: parseFloat(form.maxStock) || 100,
        costPerUnit: parseFloat(form.costPerUnit) || 0,
        isPerishable: form.isPerishable,
        supplierName: form.supplierName.trim() || undefined,
      });
      toast.success(`${item.ingredient.name} added to inventory`);
      onSaved(item);
    } catch (err: any) {
      toast.error(err.message || "Failed to add item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-text-primary">Add Ingredient</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1">Ingredient Name *</label>
              <input
                required value={form.ingredientName} onChange={(e) => set("ingredientName", e.target.value)}
                placeholder="e.g. Paneer, Tomatoes, Rice"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Unit</label>
              <select value={form.unit} onChange={(e) => set("unit", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none">
                {["kg","g","litre","ml","piece","dozen","box","bag","bundle"].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Location *</label>
              <select value={form.locationId} onChange={(e) => set("locationId", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none">
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Current Stock</label>
              <input type="number" min="0" step="0.01" value={form.currentStock} onChange={(e) => set("currentStock", e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Reorder Point</label>
              <input type="number" min="0" step="0.01" value={form.reorderPoint} onChange={(e) => set("reorderPoint", e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Max Stock</label>
              <input type="number" min="0" step="0.01" value={form.maxStock} onChange={(e) => set("maxStock", e.target.value)}
                placeholder="100"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Cost / Unit (₹)</label>
              <input type="number" min="0" step="0.01" value={form.costPerUnit} onChange={(e) => set("costPerUnit", e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1">Supplier Name</label>
              <input value={form.supplierName} onChange={(e) => set("supplierName", e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="perishable" checked={form.isPerishable}
                onChange={(e) => set("isPerishable", e.target.checked)}
                className="h-4 w-4 rounded border-border text-brand-500" />
              <label htmlFor="perishable" className="text-sm text-text-secondary">Perishable ingredient</label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
              {saving ? "Adding…" : "Add Ingredient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: Adjust Stock ───────────────────────────────────────────────────────

function AdjustStockModal({
  item,
  onClose,
  onSaved,
}: {
  item: ApiInventoryItem;
  onClose: () => void;
  onSaved: (updated: ApiInventoryItem) => void;
}) {
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("Purchase");
  const [saving, setSaving] = useState(false);

  const adjustment = parseFloat(amount) || 0;
  const newStock = mode === "add"
    ? item.currentStock + adjustment
    : Math.max(0, item.currentStock - adjustment);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustment) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    try {
      const updated = await adjustInventoryStock(
        item.id,
        mode === "add" ? adjustment : -adjustment,
        reason,
      );
      toast.success(`Stock adjusted — ${updated.ingredient.name} now ${updated.currentStock} ${updated.unit}`);
      onSaved(updated);
    } catch (err: any) {
      toast.error(err.message || "Failed to adjust stock");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Adjust Stock</h2>
            <p className="text-xs text-text-tertiary">{item.ingredient.name} · Current: {item.currentStock} {item.unit}</p>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {/* Add / Remove toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button type="button" onClick={() => setMode("add")}
              className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors",
                mode === "add" ? "bg-success-500 text-white" : "bg-surface text-text-secondary hover:bg-surface-secondary")}>
              <TrendingUp className="h-4 w-4" /> Add
            </button>
            <button type="button" onClick={() => setMode("remove")}
              className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors",
                mode === "remove" ? "bg-danger-500 text-white" : "bg-surface text-text-secondary hover:bg-surface-secondary")}>
              <TrendingDown className="h-4 w-4" /> Remove
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Amount ({item.unit})
            </label>
            <input
              type="number" min="0" step="0.01" required
              value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Reason</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none">
              {mode === "add"
                ? ["Purchase", "Transfer In", "Return from Kitchen", "Adjustment"]
                    .map(r => <option key={r}>{r}</option>)
                : ["Cooking Use", "Wastage", "Spoilage", "Transfer Out", "Adjustment"]
                    .map(r => <option key={r}>{r}</option>)
              }
            </select>
          </div>

          {amount && (
            <div className={cn("rounded-lg px-3 py-2 text-sm",
              mode === "add" ? "bg-success-50 text-success-700" : "bg-danger-50 text-danger-700")}>
              New stock: <strong>{newStock.toFixed(2)} {item.unit}</strong>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className={cn("flex-1 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-60",
                mode === "add" ? "bg-success-500 hover:bg-success-600" : "bg-danger-500 hover:bg-danger-600")}>
              {saving ? "Saving…" : "Confirm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: Log Waste ──────────────────────────────────────────────────────────

const WASTE_REASONS = ["OVERPRODUCTION", "SPOILAGE", "PREP_LOSS", "CUSTOMER_RETURN"] as const;

function WasteLogModal({
  item,
  onClose,
  onSaved,
}: {
  item: ApiInventoryItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    reason: "SPOILAGE" as typeof WASTE_REASONS[number],
    quantity: "",
    costImpact: "",
    date: today,
  });
  const [saving, setSaving] = useState(false);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseFloat(form.quantity);
    if (!qty || qty <= 0) { toast.error("Enter a valid quantity"); return; }
    if (qty > item.currentStock) { toast.error(`Cannot waste more than current stock (${item.currentStock} ${item.unit})`); return; }
    setSaving(true);
    try {
      await createWasteLog({
        locationId: item.locationId,
        itemName: item.ingredient.name,
        quantity: qty,
        unit: item.unit,
        reason: form.reason,
        costImpact: parseFloat(form.costImpact) || qty * item.ingredient.costPerUnit,
        date: form.date,
        ingredientId: item.ingredient.id,
      });
      toast.success(`Waste logged — ${qty} ${item.unit} of ${item.ingredient.name}`);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to log waste");
    } finally {
      setSaving(false);
    }
  }

  const estimatedCost = (parseFloat(form.quantity) || 0) * item.ingredient.costPerUnit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Log Waste</h2>
            <p className="text-xs text-text-tertiary">{item.ingredient.name} · Stock: {item.currentStock} {item.unit}</p>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Reason</label>
            <select
              value={form.reason}
              onChange={(e) => set("reason", e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            >
              {WASTE_REASONS.map((r) => (
                <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Quantity ({item.unit}) *
              </label>
              <input
                type="number" min="0.01" step="0.01" required
                value={form.quantity} onChange={(e) => set("quantity", e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Date</label>
              <input
                type="date" value={form.date} onChange={(e) => set("date", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Cost Impact (₹)
              {estimatedCost > 0 && (
                <span className="ml-1 font-normal text-text-tertiary">
                  · auto: ₹{estimatedCost.toFixed(2)}
                </span>
              )}
            </label>
            <input
              type="number" min="0" step="0.01"
              value={form.costImpact} onChange={(e) => set("costImpact", e.target.value)}
              placeholder={estimatedCost > 0 ? estimatedCost.toFixed(2) : "0.00"}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
              {saving ? "Logging…" : "Log Waste"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Confirm Delete Dialog ──────────────────────────────────────────────────────

function ConfirmDeleteDialog({ open, onClose, onConfirm, name, type }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  name: string;
  type: string;
}) {
  return (
    <div className={open ? "fixed inset-0 z-50 flex items-center justify-center p-4" : "hidden"}>
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Delete {type}?</h3>
        <p className="text-sm text-text-secondary">
          Are you sure you want to delete <strong>{name}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border text-text-secondary hover:bg-surface-secondary">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { can } = useAuth();
  const [items, setItems] = useState<ApiInventoryItem[]>([]);
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | StockLevel>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [adjustItem, setAdjustItem] = useState<ApiInventoryItem | null>(null);
  const [historyItem, setHistoryItem] = useState<ApiInventoryItem | null>(null);
  const [wasteItem, setWasteItem] = useState<ApiInventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [reconLogs, setReconLogs] = useState<ApiStockReconciliationLog[]>([]);
  const [reconRunning, setReconRunning] = useState(false);

  useEffect(() => {
    Promise.all([getInventory(), getLocations()])
      .then(([inv, locs]) => { setItems(inv.data); setLocations(locs); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  async function handleRunReconciliation() {
    setReconRunning(true);
    try {
      await triggerReconciliation();
      toast.success("Reconciliation started — logs will update shortly");
      // Reload logs after a brief delay to catch fast runs
      setTimeout(() => {
        getReconciliationLogs({ pageSize: 10 })
          .then((r) => setReconLogs(r.data))
          .catch(() => {});
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger reconciliation");
    } finally {
      setReconRunning(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    if (!can("inventory:delete")) return;
    try {
      await deleteInventoryItem(deleteTarget.id);
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      toast.success(`${deleteTarget.name} deleted`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
    setDeleteTarget(null);
  }

  const filtered = items.filter((item) => {
    const matchSearch = !search || item.ingredient.name.toLowerCase().includes(search.toLowerCase());
    const level = getStockLevel(item.currentStock, item.reorderPoint);
    const matchLevel = levelFilter === "all" || level === levelFilter;
    return matchSearch && matchLevel;
  });

  const lowCount = items.filter((i) => {
    const l = getStockLevel(i.currentStock, i.reorderPoint);
    return l === "low" || l === "critical" || l === "out";
  }).length;
  const outCount = items.filter((i) => getStockLevel(i.currentStock, i.reorderPoint) === "out").length;
  const totalValue = items.reduce((s, i) => s + i.currentStock * i.ingredient.costPerUnit, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Inventory</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {isLoading ? "Loading…" : `${items.length} ingredients tracked · ${lowCount} need reorder`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {can("inventory:create") && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total SKUs",     value: isLoading ? "…" : items.length.toString(),  icon: Package,       color: "text-brand-600",   bg: "bg-brand-50" },
          { label: "Need Reorder",   value: isLoading ? "…" : lowCount.toString(),      icon: AlertTriangle, color: lowCount > 0 ? "text-warning-600" : "text-success-600", bg: lowCount > 0 ? "bg-warning-50" : "bg-success-50" },
          { label: "Out of Stock",   value: isLoading ? "…" : outCount.toString(),      icon: AlertTriangle, color: outCount > 0 ? "text-danger-600" : "text-success-600",  bg: outCount > 0 ? "bg-danger-50" : "bg-success-50" },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", kpi.bg)}>
                <Icon className={cn("h-5 w-5", kpi.color)} />
              </div>
              <div>
                <p className="text-xl font-bold text-text-primary">{kpi.value}</p>
                <p className="text-xs text-text-secondary">{kpi.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ingredients…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-4 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
          />
        </div>
        <select
          value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as typeof levelFilter)}
          className="rounded-lg border border-border bg-surface py-2 pl-3 pr-8 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
        >
          <option value="all">All Levels</option>
          <option value="good">Good Stock</option>
          <option value="low">Low</option>
          <option value="critical">Critical</option>
          <option value="out">Out of Stock</option>
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-text-tertiary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading inventory…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-20 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-text-tertiary" />
          <p className="text-sm font-medium text-text-secondary">
            {items.length === 0
              ? "No inventory records yet. Add ingredients to get started."
              : "No items match your filters."}
          </p>
          {items.length === 0 && can("inventory:create") && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" /> Add First Ingredient
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Ingredient</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary sm:table-cell">Location</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary md:table-cell">Supplier</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-tertiary">Stock</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary lg:table-cell">Level</th>
                <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-tertiary lg:table-cell">Value</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => {
                const level = getStockLevel(item.currentStock, item.reorderPoint);
                const cfg = STOCK_CONFIG[level];
                const value = item.currentStock * item.ingredient.costPerUnit;
                return (
                  <tr
                    key={item.id}
                    className={cn(
                      "hover:bg-surface-secondary transition-colors",
                      level === "out" && "bg-danger-50/30",
                      level === "critical" && "bg-warning-50/20",
                    )}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-text-primary">{item.ingredient.name}</p>
                        <p className="text-xs text-text-tertiary">
                          {formatCurrency(item.ingredient.costPerUnit)}/{item.unit}
                          {item.ingredient.isPerishable && " · Perishable"}
                        </p>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell text-text-secondary">{item.location.name}</td>
                    <td className="hidden px-4 py-3 md:table-cell text-text-secondary">
                      {item.ingredient.supplier?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-text-primary">{item.currentStock} {item.unit}</span>
                      <div className="mt-1 flex justify-end">
                        <StockBar current={item.currentStock} max={item.maxStock} />
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", cfg.bg, cfg.text)}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-right lg:table-cell text-text-primary font-medium">
                      {formatCurrency(value)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {can("inventory:edit") && (
                          <button
                            onClick={() => setAdjustItem(item)}
                            className={cn(
                              "flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors",
                              level !== "good"
                                ? "border-warning-300 bg-warning-50 text-warning-700 hover:bg-warning-100"
                                : "border-border bg-surface text-text-secondary hover:bg-surface-secondary"
                            )}
                          >
                            <ShoppingCart className="h-3 w-3" />
                            Adjust
                          </button>
                        )}
                        <button
                          onClick={() => setHistoryItem(item)}
                          className="rounded-lg border border-border p-1.5 text-text-secondary hover:bg-surface-secondary transition-colors"
                          title="Movement history"
                        >
                          <History className="h-3 w-3" />
                        </button>
                        {can("inventory:edit") && (
                          <button
                            onClick={() => setWasteItem(item)}
                            className="rounded-lg border border-border p-1.5 text-text-secondary hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                            title="Log waste"
                          >
                            <Flame className="h-3 w-3" />
                          </button>
                        )}
                        {can("inventory:delete") && (
                          <button
                            onClick={() => setDeleteTarget({ id: item.id, name: item.ingredient.name })}
                            className="rounded-lg border border-border p-1.5 text-text-secondary hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-t border-border px-4 py-2.5 text-xs text-text-tertiary">
            {filtered.length} of {items.length} ingredients · Inventory value: {formatCurrency(totalValue)}
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <AddItemModal
          locations={locations}
          onClose={() => setShowAddModal(false)}
          onSaved={(item) => { setItems((prev) => [item, ...prev]); setShowAddModal(false); }}
        />
      )}

      {/* Adjust Stock Modal */}
      {adjustItem && (
        <AdjustStockModal
          item={adjustItem}
          onClose={() => setAdjustItem(null)}
          onSaved={(updated) => {
            setItems((prev) => prev.map((i) => i.id === updated.id ? updated : i));
            setAdjustItem(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        name={deleteTarget?.name ?? ""}
        type="Inventory Item"
      />

      {/* Stock Movement History Slide-over */}
      {historyItem && (
        <StockMovementPanel
          item={historyItem}
          onClose={() => setHistoryItem(null)}
        />
      )}

      {/* Waste Log Modal */}
      {wasteItem && (
        <WasteLogModal
          item={wasteItem}
          onClose={() => setWasteItem(null)}
          onSaved={() => {
            // Reload inventory to reflect updated stock
            getInventory()
              .then((inv) => setItems(inv.data))
              .catch(() => {});
            setWasteItem(null);
          }}
        />
      )}

      {/* Reconciliation Section (ADMIN only) */}
      {can("inventory:delete") && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Stock Reconciliation</h3>
              <p className="text-xs text-text-tertiary mt-0.5">
                Compares movement ledger totals against current stock values. Runs automatically at 02:00 nightly.
              </p>
            </div>
            <button
              onClick={handleRunReconciliation}
              disabled={reconRunning}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", reconRunning && "animate-spin")} />
              {reconRunning ? "Queuing…" : "Run Now"}
            </button>
          </div>

          {reconLogs.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary">
                    <th className="px-3 py-2 text-left font-semibold text-text-tertiary">Ingredient</th>
                    <th className="px-3 py-2 text-right font-semibold text-text-tertiary">Expected</th>
                    <th className="px-3 py-2 text-right font-semibold text-text-tertiary">Actual</th>
                    <th className="px-3 py-2 text-right font-semibold text-text-tertiary">Drift</th>
                    <th className="px-3 py-2 text-left font-semibold text-text-tertiary">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reconLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-secondary/50">
                      <td className="px-3 py-2 text-text-primary">{log.inventoryItem?.ingredient?.name ?? log.inventoryItemId}</td>
                      <td className="px-3 py-2 text-right text-text-secondary">{log.expectedStock}</td>
                      <td className="px-3 py-2 text-right text-text-secondary">{log.actualStock}</td>
                      <td className={cn("px-3 py-2 text-right font-semibold", Math.abs(log.drift) > 0 ? "text-danger-600" : "text-success-600")}>
                        {log.drift > 0 ? "+" : ""}{log.drift}
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", log.resolved ? "bg-success-50 text-success-700" : "bg-warning-50 text-warning-700")}>
                          {log.resolved ? "Resolved" : "Open"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reconLogs.length === 0 && (
            <p className="text-xs text-text-tertiary">No reconciliation logs yet. Run the first check to see results.</p>
          )}
        </div>
      )}
    </div>
  );
}
