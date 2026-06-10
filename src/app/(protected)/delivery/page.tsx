"use client";

import { useState, useEffect } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  Loader2,
  ShoppingCart,
} from "lucide-react";
import { getOrders, updateOrderStatus, type ApiOrder } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

// ── Status helpers ─────────────────────────────────────────

type DisplayStatus = "pending" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";

function toDisplayStatus(status: string): DisplayStatus {
  switch (status) {
    case "PENDING":
    case "CONFIRMED":
      return "pending";
    case "PREPARING":
      return "preparing";
    case "DISPATCHED":
      return "out_for_delivery";
    case "DELIVERED":
      return "delivered";
    case "CANCELLED":
      return "cancelled";
    default:
      return "pending";
  }
}

const STATUS_CONFIG: Record<DisplayStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  pending:          { label: "Pending",          bg: "bg-surface-tertiary", text: "text-text-secondary", icon: Clock },
  preparing:        { label: "Preparing",        bg: "bg-amber-50",         text: "text-amber-700",      icon: Package },
  out_for_delivery: { label: "Out for Delivery", bg: "bg-brand-50",         text: "text-brand-600",      icon: Truck },
  delivered:        { label: "Delivered",        bg: "bg-success-50",       text: "text-success-700",    icon: CheckCircle2 },
  cancelled:        { label: "Cancelled",        bg: "bg-danger-50",        text: "text-danger-600",     icon: AlertCircle },
};

// ── Next status transitions ────────────────────────────────

const NEXT_STATUS: Partial<Record<string, string>> = {
  PENDING:    "CONFIRMED",
  CONFIRMED:  "PREPARING",
  PREPARING:  "DISPATCHED",
  DISPATCHED: "DELIVERED",
};

const NEXT_LABEL: Partial<Record<string, string>> = {
  PENDING:    "Confirm",
  CONFIRMED:  "Start Preparing",
  PREPARING:  "Mark Dispatched",
  DISPATCHED: "Mark Delivered",
};

// ── Component ──────────────────────────────────────────────

export default function DeliveryPage() {
  const { can } = useAuth();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | DisplayStatus>("all");
  const canEditDelivery = can("delivery:edit");

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    setIsLoading(true);
    getOrders({ dateFrom: today, dateTo: today, pageSize: 100 })
      .then((res) => setOrders(res.data))
      .catch(() => setOrders([]))
      .finally(() => setIsLoading(false));
  }, [today]);

  async function advance(order: ApiOrder) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setUpdatingId(order.id);
    try {
      const updated = await updateOrderStatus(order.id, next);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch {
      toast.error(`Failed to update ${order.orderNumber}`);
    } finally {
      setUpdatingId(null);
    }
  }

  const active = orders.filter((o) => o.status !== "CANCELLED");
  const pending = active.filter((o) => ["PENDING", "CONFIRMED"].includes(o.status)).length;
  const preparing = active.filter((o) => o.status === "PREPARING").length;
  const outForDelivery = active.filter((o) => o.status === "DISPATCHED").length;
  const delivered = active.filter((o) => o.status === "DELIVERED").length;

  const filtered = orders.filter((o) => {
    if (statusFilter === "all") return true;
    return toDisplayStatus(o.status) === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-brand-500" />
            <h1 className="text-2xl font-bold text-text-primary">Delivery Management</h1>
            <span className="flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-bold text-success-700">
              <span className="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" />
              LIVE
            </span>
          </div>
          <p className="mt-0.5 text-sm text-text-secondary">
            {isLoading ? "Loading…" : `${outForDelivery} in transit · ${pending} pending · ${delivered} delivered today`}
          </p>
        </div>
        <button
          onClick={() => {
            setIsLoading(true);
            getOrders({ dateFrom: today, dateTo: today, pageSize: 100 })
              .then((res) => setOrders(res.data))
              .catch(() => {})
              .finally(() => setIsLoading(false));
          }}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-secondary"
        >
          Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Pending",          value: pending,         color: "text-text-secondary", bg: "bg-surface-tertiary", icon: Clock },
          { label: "Preparing",        value: preparing,       color: "text-amber-600",       bg: "bg-amber-50",         icon: Package },
          { label: "Out for Delivery", value: outForDelivery,  color: "text-brand-600",       bg: "bg-brand-50",         icon: Truck },
          { label: "Delivered Today",  value: delivered,       color: "text-success-600",     bg: "bg-success-50",       icon: CheckCircle2 },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", kpi.bg)}>
                <Icon className={cn("h-4 w-4", kpi.color)} />
              </div>
              <div>
                <p className="text-xl font-bold text-text-primary">
                  {isLoading ? "…" : kpi.value}
                </p>
                <p className="text-xs text-text-secondary">{kpi.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "preparing", "out_for_delivery", "delivered", "cancelled"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              statusFilter === s
                ? "bg-brand-500 text-white"
                : "border border-border bg-surface text-text-secondary hover:bg-surface-secondary"
            )}
          >
            {s === "all" ? "All Orders" : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-text-tertiary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading today's orders…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-20 text-center">
          <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-text-tertiary" />
          <p className="text-sm font-medium text-text-secondary">
            No orders match this filter
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const ds = toDisplayStatus(order.status);
            const cfg = STATUS_CONFIG[ds];
            const StatusIcon = cfg.icon;
            const nextStatus = NEXT_STATUS[order.status];
            const nextLabel = NEXT_LABEL[order.status];
            const isUpdating = updatingId === order.id;

            return (
              <div
                key={order.id}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-brand-600">{order.orderNumber}</span>
                      <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", cfg.bg, cfg.text)}>
                        <StatusIcon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                      <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] text-text-tertiary">
                        {order.mealSlot}
                      </span>
                    </div>

                    <p className="mt-1 text-sm font-medium text-text-primary">
                      {order.customer?.name}
                      {order.customer?.corporateAccount && (
                        <span className="ml-1.5 text-xs text-text-tertiary">
                          · {order.customer.corporateAccount.companyName}
                        </span>
                      )}
                    </p>

                    <div className="mt-1 flex items-center gap-1.5 text-xs text-text-secondary">
                      <MapPin className="h-3 w-3 shrink-0 text-text-tertiary" />
                      <span>{order.location?.name}</span>
                    </div>

                    {order.items && order.items.length > 0 && (
                      <p className="mt-1 text-xs text-text-tertiary">
                        {order.items.slice(0, 3).map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                        {order.items.length > 3 && ` +${order.items.length - 3} more`}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <p className="text-sm font-semibold text-text-primary">{formatCurrency(order.total)}</p>
                    <div className="flex items-center gap-1 justify-end text-xs text-text-tertiary">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                </div>

                {nextStatus && nextLabel && canEditDelivery && (
                  <div className="mt-3 flex justify-end border-t border-border pt-3">
                    <button
                      onClick={() => advance(order)}
                      disabled={isUpdating}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                        ds === "out_for_delivery"
                          ? "bg-success-500 text-white hover:bg-success-600"
                          : "bg-brand-500 text-white hover:bg-brand-600",
                        isUpdating && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      {nextLabel}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
