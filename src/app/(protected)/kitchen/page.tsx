"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Flame, Monitor, Volume2, VolumeX, UtensilsCrossed, Loader2, RefreshCw } from "lucide-react";
import { getOrders, updateOrderStatus, type ApiOrder } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────

type KDSStatus = "pending" | "in_progress" | "ready" | "dispatched";

interface ProductionItem {
  name: string;
  qty: number;           // Total batch quantity (e.g. 186 portions of Paneer Mutter)
  unit: string;          // "portions" | "rotis" | "litres"
  station: string;
  done: boolean;
}

interface ProductionBatch {
  id: string;
  orderNumber: string;
  account: string;       // Corporate account (e.g. "BMW TechWorks")
  location: string;      // Delivery location
  mealType: "Breakfast" | "Lunch" | "High Tea" | "Dinner";
  servings: number;      // Total meals in this batch (e.g. 186)
  dispatchBy: string;    // Target dispatch time
  items: ProductionItem[];
  status: KDSStatus;
  startedAt: string | null;
  placedAt: string;
}

// ── API → KDS mapping ────────────────────────────────────

const MEAL_SLOT_LABEL: Record<string, ProductionBatch["mealType"]> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  SNACKS: "High Tea",
  DINNER: "Dinner",
};

const DISPATCH_TIME: Record<string, string> = {
  BREAKFAST: "8:30 AM",
  LUNCH: "12:30 PM",
  SNACKS: "4:30 PM",
  DINNER: "8:00 PM",
};

const API_KDS_STATUS: Record<string, KDSStatus> = {
  PENDING: "pending",
  CONFIRMED: "pending",
  PREPARING: "in_progress",
  READY: "ready",
  DISPATCHED: "dispatched",
  DELIVERED: "dispatched",
};

const KDS_NEXT_API: Record<Exclude<KDSStatus, "dispatched">, string> = {
  pending: "PREPARING",
  in_progress: "READY",
  ready: "DISPATCHED",
};

function mapToStation(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("dal") || n.includes("aamti") || n.includes("varan") || n.includes("sambar") || n.includes("kadhi") || n.includes("rasam")) return "Dal";
  if (n.includes("rice") || n.includes("bhaat") || n.includes("pulao") || n.includes("biryani") || n.includes("khichdi") || n.includes("jeera rice")) return "Rice";
  if (n.includes("roti") || n.includes("chapati") || n.includes("puri") || n.includes("paratha") || n.includes("naan") || n.includes("bhakri") || n.includes("phulka")) return "Roti";
  if (n.includes("salad") || n.includes("raita") || n.includes("kachumber") || n.includes("fryums") || n.includes("papad") || n.includes("pickle") || n.includes("chutney") || n.includes("achaar")) return "Salad";
  if (n.includes("juice") || n.includes("chai") || n.includes("tea") || n.includes("coffee") || n.includes("lassi") || n.includes("buttermilk") || n.includes("chaas") || n.includes("sharbat")) return "Beverages";
  return "Sabzi";
}

function mapApiToBatch(o: ApiOrder): ProductionBatch {
  const servings = o.items.reduce((sum, i) => sum + i.quantity, 0) || 1;
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    account: o.customer.corporateAccount?.companyName ?? o.customer.name,
    location: o.location.name,
    mealType: MEAL_SLOT_LABEL[o.mealSlot] ?? "Lunch",
    servings,
    dispatchBy: DISPATCH_TIME[o.mealSlot] ?? "12:30 PM",
    status: API_KDS_STATUS[o.status] ?? "pending",
    startedAt: o.status === "PREPARING" ? o.createdAt : null,
    placedAt: o.createdAt,
    items: o.items.map((item) => ({
      name: item.name,
      qty: item.quantity,
      unit: "portions",
      station: mapToStation(item.name),
      done: false,
    })),
  };
}

type Station = "All" | "Sabzi" | "Dal" | "Rice" | "Roti" | "Salad" | "Beverages";
const STATIONS: Station[] = ["All", "Sabzi", "Dal", "Rice", "Roti", "Salad", "Beverages"];

function minutesSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

function urgencyColor(batch: ProductionBatch) {
  if (batch.status === "dispatched") return "border-border bg-surface-secondary opacity-70";
  if (batch.status === "ready") return "border-success-400 bg-success-50";
  const age = minutesSince(batch.placedAt);
  if (age > 45) return "border-danger-500 bg-danger-50";
  if (age > 25) return "border-warning-500 bg-warning-50";
  return "border-border bg-surface";
}

// ── Production Batch Card ───────────────────────────────────

function BatchCard({
  batch,
  station,
  canEdit,
  onItemDone,
  onBatchReady,
  onDispatch,
  onStart,
}: {
  batch: ProductionBatch;
  station: Station;
  canEdit: boolean;
  onItemDone: (batchId: string, itemName: string) => void;
  onBatchReady: (batchId: string) => void;
  onDispatch: (batchId: string) => void;
  onStart: (batchId: string) => void;
}) {
  const age = minutesSince(batch.placedAt);
  const visibleItems =
    station === "All" ? batch.items : batch.items.filter((i) => i.station === station);

  if (visibleItems.length === 0) return null;

  const allDone = batch.items.every((i) => i.done);
  const doneCount = batch.items.filter((i) => i.done).length;

  return (
    <div className={cn("rounded-xl border-2 p-4 transition-all", urgencyColor(batch))}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-text-tertiary">{batch.orderNumber}</span>
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700 uppercase">
              {batch.mealType}
            </span>
          </div>
          <p className="mt-1 text-base font-bold text-text-primary truncate">{batch.account}</p>
          <p className="text-xs text-text-secondary">{batch.location}</p>
        </div>
        <div className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
          age > 45 ? "bg-danger-100 text-danger-700" : age > 25 ? "bg-warning-100 text-warning-700" : "bg-success-100 text-success-700"
        )}>
          <Clock className="h-3 w-3" />
          {age}m
        </div>
      </div>

      {/* Servings + dispatch */}
      <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-secondary px-3 py-2">
        <div className="flex items-center gap-1.5">
          <UtensilsCrossed className="h-3.5 w-3.5 text-brand-500" />
          <span className="text-sm font-bold text-text-primary">{batch.servings} meals</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <Clock className="h-3 w-3" />
          Dispatch by {batch.dispatchBy}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-text-tertiary mb-1">
          <span>{doneCount}/{batch.items.length} components ready</span>
          <span>{Math.round((doneCount / batch.items.length) * 100)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-success-500 transition-all duration-500"
            style={{ width: `${(doneCount / batch.items.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Items — production checklist */}
      <div className="mt-4 space-y-2">
        {visibleItems.map((item) => (
          <button
            key={item.name}
            onClick={() => onItemDone(batch.id, item.name)}
            disabled={item.done || batch.status !== "in_progress" || !canEdit}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all",
              item.done
                ? "border-success-200 bg-success-50 opacity-80"
                : "border-border bg-white hover:border-brand-300 hover:bg-brand-50"
            )}
          >
            <div className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
              item.done ? "border-success-500 bg-success-500" : "border-border bg-white"
            )}>
              {item.done && <CheckCircle2 className="h-4 w-4 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <span className={cn(
                "block text-sm font-semibold leading-tight",
                item.done ? "text-success-700 line-through" : "text-text-primary"
              )}>
                {item.name}
              </span>
              <span className="text-[10px] text-text-tertiary uppercase tracking-wide">{item.station}</span>
            </div>
            <span className={cn(
              "shrink-0 text-sm font-bold",
              item.done ? "text-success-600" : "text-brand-600"
            )}>
              ×{item.qty.toLocaleString("en-IN")}
            </span>
          </button>
        ))}
      </div>

      {/* Action footer */}
      {batch.status === "pending" && canEdit && (
        <button
          onClick={() => onStart(batch.id)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-600"
        >
          <Flame className="h-4 w-4" />
          Start Production
        </button>
      )}

      {batch.status === "in_progress" && station === "All" && canEdit && (
        <button
          onClick={() => onBatchReady(batch.id)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-success-400 bg-success-50 py-2.5 text-sm font-bold text-success-700 transition-colors hover:bg-success-100"
        >
          <CheckCircle2 className="h-4 w-4" />
          {allDone ? "Mark Batch Ready" : "Mark All Ready"}
        </button>
      )}

      {batch.status === "ready" && canEdit && (
        <button
          onClick={() => onDispatch(batch.id)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-success-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-success-700"
        >
          <CheckCircle2 className="h-4 w-4" />
          Dispatch Batch
        </button>
      )}

      {allDone && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-success-50 py-2.5 text-sm font-bold text-success-700">
          <CheckCircle2 className="h-4 w-4" />
          {batch.status === "dispatched" ? "Dispatched" : "Ready — Awaiting Dispatch"}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────

export default function KitchenPage() {
  const { can } = useAuth();
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [station, setStation] = useState<Station>("All");
  const [soundOn, setSoundOn] = useState(true);
  const [, forceUpdate] = useState(0);
  const canEditKitchen = can("kitchen:edit");

  async function loadOrders() {
    try {
      const res = await getOrders({ pageSize: 100 });
      const active = res.data.filter((o) =>
        ["PENDING", "CONFIRMED", "PREPARING", "READY", "DISPATCHED"].includes(o.status)
      );
      setBatches(active.map(mapApiToBatch));
    } catch {
      setBatches([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
    const t = setInterval(() => forceUpdate((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  function markItemDone(batchId: string, itemName: string) {
    if (!canEditKitchen) return;
    setBatches((prev) =>
      prev.map((b) => {
        if (b.id !== batchId || b.status !== "in_progress") return b;
        const items = b.items.map((i) =>
          i.name === itemName ? { ...i, done: true } : i
        );
        return { ...b, items };
      })
    );
  }

  async function markBatchReady(batchId: string) {
    if (!canEditKitchen) return;
    const previous = batches;
    setBatches((prev) =>
      prev.map((b) =>
        b.id !== batchId ? b : { ...b, status: "ready", items: b.items.map((i) => ({ ...i, done: true })) }
      )
    );
    try {
      await updateOrderStatus(batchId, KDS_NEXT_API.in_progress);
    } catch {
      setBatches(previous);
      toast.error("Failed to mark batch ready");
    }
  }

  async function dispatchBatch(batchId: string) {
    if (!canEditKitchen) return;
    const previous = batches;
    setBatches((prev) =>
      prev.map((b) =>
        b.id !== batchId ? b : { ...b, status: "dispatched" }
      )
    );
    try {
      await updateOrderStatus(batchId, KDS_NEXT_API.ready);
    } catch {
      setBatches(previous);
      toast.error("Failed to dispatch batch");
    }
  }

  async function startBatch(batchId: string) {
    if (!canEditKitchen) return;
    const previous = batches;
    setBatches((prev) =>
      prev.map((b) =>
        b.id !== batchId ? b : { ...b, status: "in_progress", startedAt: new Date().toISOString() }
      )
    );
    try {
      await updateOrderStatus(batchId, KDS_NEXT_API.pending);
    } catch {
      setBatches(previous);
      toast.error("Failed to start production");
    }
  }

  const active = batches.filter((b) => b.status !== "dispatched");
  const done = batches.filter((b) => b.status === "dispatched");
  const totalMealsActive = active.reduce((sum, b) => sum + b.servings, 0);

  const filteredBatches = batches.filter((b) =>
    station === "All" ? true : b.items.some((i) => i.station === station)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-brand-500" />
            <h1 className="text-2xl font-bold text-text-primary">Kitchen Display</h1>
            <span className="flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-bold text-success-700">
              <span className="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" />
              LIVE
            </span>
          </div>
          <p className="mt-0.5 text-sm text-text-secondary">
            {active.length} batches in production · {totalMealsActive} meals pending · {done.length} dispatched today
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadOrders}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => setSoundOn(!soundOn)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              soundOn
                ? "border-brand-200 bg-brand-50 text-brand-600"
                : "border-border bg-surface text-text-secondary"
            )}
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            Sound {soundOn ? "On" : "Off"}
          </button>
          <div className="flex items-center gap-1.5 text-sm text-text-secondary">
            <Flame className="h-4 w-4 text-danger-500" />
            <span className="font-semibold text-text-primary">{active.length}</span> active
          </div>
        </div>
      </div>

      {/* Station filter tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1">
        {STATIONS.map((s) => {
          const count = s === "All"
            ? batches.filter((b) => b.status !== "dispatched").length
            : batches.filter((b) => b.status !== "dispatched" && b.items.some((i) => i.station === s && !i.done)).length;
          return (
            <button
              key={s}
              onClick={() => setStation(s)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                station === s
                  ? "bg-brand-500 text-white"
                  : "text-text-secondary hover:bg-surface-secondary"
              )}
            >
              {s}
              {count > 0 && (
                <span className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                  station === s ? "bg-white/20 text-white" : "bg-surface-secondary text-text-tertiary"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-text-tertiary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading orders…
        </div>
      )}

      {/* KDS grid */}
      {!isLoading && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {/* Active batches first — sorted by dispatch time */}
        {filteredBatches
          .filter((b) => b.status !== "dispatched")
          .sort((a, b) => a.dispatchBy.localeCompare(b.dispatchBy))
          .map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              station={station}
              canEdit={canEditKitchen}
              onItemDone={markItemDone}
              onBatchReady={markBatchReady}
              onDispatch={dispatchBatch}
              onStart={startBatch}
            />
          ))}
        {/* Done batches */}
        {filteredBatches
          .filter((b) => b.status === "dispatched")
          .map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              station={station}
              canEdit={canEditKitchen}
              onItemDone={markItemDone}
              onBatchReady={markBatchReady}
              onDispatch={dispatchBatch}
              onStart={startBatch}
            />
          ))}
      </div>}

      {!isLoading && filteredBatches.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-text-tertiary">
          <CheckCircle2 className="h-10 w-10 text-success-400" />
          <p className="mt-3 text-base font-semibold text-text-secondary">Kitchen is clear!</p>
          <p className="text-sm">No pending batches for this station.</p>
        </div>
      )}
    </div>
  );
}
