"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { formatCurrency, cn } from "@/lib/utils";
import {
  cancelOrder,
  getOrder,
  getOrders,
  updateOrder,
  updateOrderStatus,
  type ApiOrder,
  type ApiOrderDetail,
} from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import {
  Clock,
  MapPin,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  CheckCircle2,
  Flame,
  AlertCircle,
  Eye,
  UtensilsCrossed,
  Truck,
  Loader2,
  CalendarDays,
  Phone,
  Mail,
  Building2,
  StickyNote,
  CreditCard,
  Save,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OrderStatus =
  | "new"
  | "confirmed"
  | "preparing"
  | "ready"
  | "dispatched"
  | "delivered";

type MealType = "Breakfast" | "Lunch" | "High Tea" | "Dinner";

interface BulkOrder {
  id: string;
  orderNumber: string;
  account: string;
  location: string;
  mealType: MealType;
  menuSummary: string;
  mealsBooked: number;
  mealsServed: number | null;
  ratePerMeal: number;
  total: number;
  status: OrderStatus;
  dispatchBy: string;
  placedAt: string;
}

interface OrderEditForm {
  deliveryDate: string;
  mealSlot: string;
  specialInstructions: string;
}

const API_STATUS_MAP: Record<string, OrderStatus> = {
  PENDING: "new",
  CONFIRMED: "confirmed",
  PREPARING: "preparing",
  READY: "ready",
  DISPATCHED: "dispatched",
  DELIVERED: "delivered",
};

const UI_STATUS_MAP: Record<OrderStatus, string> = {
  new: "PENDING",
  confirmed: "CONFIRMED",
  preparing: "PREPARING",
  ready: "READY",
  dispatched: "DISPATCHED",
  delivered: "DELIVERED",
};

const MEAL_SLOT_MAP: Record<string, MealType> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  SNACKS: "High Tea",
  DINNER: "Dinner",
};

const MEAL_SLOT_OPTIONS = [
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "LUNCH", label: "Lunch" },
  { value: "SNACKS", label: "High Tea" },
  { value: "DINNER", label: "Dinner" },
] as const;

const COLUMNS: { id: OrderStatus; label: string; color: string; dot: string }[] = [
  { id: "new", label: "New", color: "bg-info-50 border-info-500 text-info-700", dot: "bg-info-500" },
  { id: "confirmed", label: "Confirmed", color: "bg-brand-50 border-brand-500 text-brand-700", dot: "bg-brand-500" },
  { id: "preparing", label: "In Kitchen", color: "bg-warning-50 border-warning-500 text-warning-700", dot: "bg-warning-500" },
  { id: "ready", label: "Ready", color: "bg-success-50 border-success-500 text-success-700", dot: "bg-success-500" },
  { id: "dispatched", label: "Dispatched", color: "bg-purple-50 border-purple-500 text-purple-700", dot: "bg-purple-500" },
  { id: "delivered", label: "Delivered", color: "bg-surface-tertiary border-border text-text-secondary", dot: "bg-text-tertiary" },
];

const STATUS_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  new: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "dispatched",
  dispatched: "delivered",
};

function mapApiOrder(order: ApiOrder): BulkOrder | null {
  const status = API_STATUS_MAP[order.status];
  if (!status) return null;

  const mealsBooked = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const ratePerMeal = mealsBooked > 0 ? order.subtotal / mealsBooked : 0;
  const menuSummary =
    order.items.length > 0
      ? order.items
          .slice(0, 3)
          .map((item) => `${item.name} ×${item.quantity}`)
          .join(", ") + (order.items.length > 3 ? ` +${order.items.length - 3} more` : "")
      : "No items";

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    account: order.customer.corporateAccount?.companyName ?? order.customer.name,
    location: order.location.name,
    mealType: MEAL_SLOT_MAP[order.mealSlot] ?? "Lunch",
    menuSummary,
    mealsBooked,
    mealsServed: null,
    ratePerMeal,
    total: order.total,
    status,
    dispatchBy: formatTime(order.deliveryDate),
    placedAt: order.createdAt,
  };
}

function minutesAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

function formatTime(value: string | null | undefined) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getLocalDateKey(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateTimeInputValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildEditForm(order: ApiOrderDetail): OrderEditForm {
  return {
    deliveryDate: toDateTimeInputValue(order.deliveryDate),
    mealSlot: order.mealSlot,
    specialInstructions: order.specialInstructions ?? "",
  };
}

function getStatusMeta(apiStatus: string) {
  const uiStatus = API_STATUS_MAP[apiStatus];
  if (uiStatus) {
    const column = COLUMNS.find((item) => item.id === uiStatus);
    if (column) return column;
  }

  if (apiStatus === "CANCELLED") {
    return {
      id: "cancelled",
      label: "Cancelled",
      color: "bg-danger-50 border-danger-500 text-danger-700",
      dot: "bg-danger-500",
    };
  }

  return {
    id: "unknown",
    label: apiStatus,
    color: "bg-surface-secondary border-border text-text-secondary",
    dot: "bg-text-tertiary",
  };
}

function getNextApiStatus(apiStatus: string) {
  const uiStatus = API_STATUS_MAP[apiStatus];
  if (!uiStatus) return null;
  const nextUiStatus = STATUS_NEXT[uiStatus];
  if (!nextUiStatus) return null;
  return UI_STATUS_MAP[nextUiStatus];
}

function getAdvanceLabel(apiStatus: string) {
  const nextApiStatus = getNextApiStatus(apiStatus);
  switch (nextApiStatus) {
    case "CONFIRMED":
      return "Accept";
    case "PREPARING":
      return "Start Prep";
    case "READY":
      return "Mark Ready";
    case "DISPATCHED":
      return "Dispatch";
    case "DELIVERED":
      return "Confirm Delivered";
    default:
      return null;
  }
}

function isCancellable(apiStatus: string) {
  return apiStatus === "PENDING" || apiStatus === "CONFIRMED";
}

function BulkOrderCard({
  order,
  canAdvance,
  onAdvance,
  onView,
}: {
  order: BulkOrder;
  canAdvance: boolean;
  onAdvance: (id: string) => void;
  onView: (id: string) => void;
}) {
  const age = minutesAgo(order.placedAt);
  const isUrgent = age > 60 && order.status !== "delivered" && order.status !== "dispatched";
  const nextStatus = STATUS_NEXT[order.status];

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onView(order.id);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onView(order.id)}
      onKeyDown={handleKeyDown}
      className={cn(
        "rounded-xl border bg-surface p-4 shadow-sm transition-all hover:border-brand-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500",
        isUrgent ? "border-danger-500" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-text-tertiary">{order.orderNumber}</p>
          <p className="mt-0.5 text-sm font-bold text-text-primary">{order.account}</p>
        </div>
        <div className="flex items-center gap-1">
          {isUrgent && <AlertCircle className="h-4 w-4 text-danger-500" />}
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-600">
            {order.mealType}
          </span>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <MapPin className="h-3 w-3 shrink-0" />
          {order.location}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <Clock className="h-3 w-3 shrink-0" />
          Dispatch by {order.dispatchBy}
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-5 text-text-secondary">
        {order.menuSummary}
      </p>

      <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-surface-secondary px-3 py-2">
        <UtensilsCrossed className="h-3.5 w-3.5 text-brand-500" />
        <span className="text-sm font-bold text-text-primary">{order.mealsBooked} meals</span>
        <span className="text-xs text-text-tertiary">@ {formatCurrency(order.ratePerMeal)}/plate</span>
        {order.mealsServed !== null && order.mealsServed !== order.mealsBooked && (
          <span className="ml-auto text-xs font-medium text-warning-600">
            Served: {order.mealsServed}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <p className="text-sm font-bold text-text-primary">{formatCurrency(order.total)}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onView(order.id);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-surface-secondary"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <Link
            href={`/orders/${order.id}`}
            onClick={(event) => event.stopPropagation()}
            className="flex h-7 items-center gap-1 rounded-lg border border-border px-2 text-[10px] font-medium text-text-secondary transition-colors hover:bg-surface-secondary"
          >
            Details
          </Link>
          {nextStatus && canAdvance && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onAdvance(order.id);
              }}
              className="flex h-7 items-center gap-1.5 rounded-lg bg-brand-500 px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-600"
            >
              <CheckCircle2 className="h-3 w-3" />
              {getAdvanceLabel(UI_STATUS_MAP[order.status])}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderDetailDialog({
  orderId,
  open,
  onClose,
  onOrderChanged,
}: {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
  onOrderChanged: () => Promise<void>;
}) {
  const { can } = useAuth();
  const [order, setOrder] = useState<ApiOrderDetail | null>(null);
  const [form, setForm] = useState<OrderEditForm>({
    deliveryDate: "",
    mealSlot: "LUNCH",
    specialInstructions: "",
  });
  const [cancelReason, setCancelReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getOrder(orderId);
      setOrder(data);
      setForm(buildEditForm(data));
      setCancelReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order");
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (open && orderId) {
      void loadOrder();
      return;
    }

    setOrder(null);
    setError(null);
    setIsLoading(false);
    setIsSaving(false);
    setCancelReason("");
  }, [loadOrder, open, orderId]);

  const canEdit = !!order && can("orders:edit") && !["CANCELLED", "REFUNDED"].includes(order.status);
  const canEditSchedule = !!order && canEdit && !["DISPATCHED", "DELIVERED"].includes(order.status);
  const nextApiStatus = order ? getNextApiStatus(order.status) : null;
  const nextActionLabel = order ? getAdvanceLabel(order.status) : null;
  const originalForm = order ? buildEditForm(order) : null;
  const formDirty =
    !!order &&
    !!originalForm &&
    (originalForm.deliveryDate !== form.deliveryDate ||
      originalForm.mealSlot !== form.mealSlot ||
      originalForm.specialInstructions !== form.specialInstructions);
  const customerAddress = order?.customer.addresses?.find((address) => address.isDefault) ?? order?.customer.addresses?.[0];
  const statusMeta = getStatusMeta(order?.status ?? "");

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order || !canEdit || !originalForm) return;
    if ((form.deliveryDate !== originalForm.deliveryDate || form.mealSlot !== originalForm.mealSlot) && !form.deliveryDate) {
      setError("Delivery date and time are required");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const payload: {
        deliveryDate?: string;
        mealSlot?: string;
        specialInstructions?: string;
      } = {};

      if (form.deliveryDate !== originalForm.deliveryDate) {
        payload.deliveryDate = new Date(form.deliveryDate).toISOString();
      }

      if (form.mealSlot !== originalForm.mealSlot) {
        payload.mealSlot = form.mealSlot;
      }

      if (form.specialInstructions !== originalForm.specialInstructions) {
        payload.specialInstructions = form.specialInstructions;
      }

      const updated = await updateOrder(order.id, payload);
      setOrder(updated);
      setForm(buildEditForm(updated));
      await onOrderChanged();
      toast.success(`Order ${updated.orderNumber} updated`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAdvance() {
    if (!order || !nextApiStatus || !canEdit) return;
    setIsSaving(true);
    setError(null);
    try {
      await updateOrderStatus(order.id, nextApiStatus);
      await Promise.all([loadOrder(), onOrderChanged()]);
      toast.success(`Order moved to ${nextApiStatus.toLowerCase()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCancel() {
    if (!order || !canEdit) return;
    const reason = cancelReason.trim();
    if (!reason) {
      setError("Cancellation reason is required");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await cancelOrder(order.id, reason);
      await onOrderChanged();
      toast.success(`Order ${order.orderNumber} cancelled`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel order");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>{order?.orderNumber ?? "Order details"}</span>
            {order && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                  statusMeta.color,
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", statusMeta.dot)} />
                {statusMeta.label}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Review customer, items, payment, and delivery details. Editable fields are limited to schedule and notes.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-tertiary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading order details…
          </div>
        ) : !order ? (
          <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
            {error ?? "Order not found"}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6 pt-2">
            {error && (
              <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-border bg-surface-secondary p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Placed</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">{formatDateTime(order.createdAt)}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-secondary p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Delivery</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">{formatDateTime(order.deliveryDate)}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-secondary p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Meals</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)} portions
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface-secondary p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Total</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">{formatCurrency(order.total)}</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.35fr,0.95fr]">
              <div className="space-y-6">
                <section className="rounded-xl border border-border bg-surface p-5">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="h-4 w-4 text-brand-600" />
                    <h3 className="text-base font-semibold text-text-primary">Order items</h3>
                  </div>
                  <div className="mt-4 overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-secondary text-left text-xs uppercase tracking-wide text-text-tertiary">
                        <tr>
                          <th className="px-4 py-3">Item</th>
                          <th className="px-4 py-3">Qty</th>
                          <th className="px-4 py-3">Rate</th>
                          <th className="px-4 py-3">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {order.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3">
                              <p className="font-medium text-text-primary">{item.name}</p>
                              {item.menuItem?.slug && (
                                <p className="text-xs text-text-tertiary">{item.menuItem.slug}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-text-secondary">{item.quantity}</td>
                            <td className="px-4 py-3 text-text-secondary">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-4 py-3 font-medium text-text-primary">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 space-y-2 rounded-lg border border-border bg-surface-secondary p-4 text-sm">
                    <div className="flex items-center justify-between text-text-secondary">
                      <span>Subtotal</span>
                      <span>{formatCurrency(order.subtotal)}</span>
                    </div>
                    {order.discountAmount > 0 && (
                      <div className="flex items-center justify-between text-text-secondary">
                        <span>Discount</span>
                        <span>-{formatCurrency(order.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-text-secondary">
                      <span>Tax</span>
                      <span>{formatCurrency(order.totalTax)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-2 font-semibold text-text-primary">
                      <span>Grand total</span>
                      <span>{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-border bg-surface p-5">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-brand-600" />
                    <h3 className="text-base font-semibold text-text-primary">Schedule and notes</h3>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="deliveryDate">Delivery date and time</Label>
                      <Input
                        id="deliveryDate"
                        type="datetime-local"
                        value={form.deliveryDate}
                        onChange={(event) => setForm((current) => ({ ...current, deliveryDate: event.target.value }))}
                        disabled={!canEditSchedule || isSaving}
                      />
                      {!canEditSchedule && (
                        <p className="text-xs text-text-tertiary">
                          Schedule changes are locked after dispatch.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mealSlot">Meal slot</Label>
                      <Select
                        value={form.mealSlot}
                        onValueChange={(value) => setForm((current) => ({ ...current, mealSlot: value }))}
                        disabled={!canEditSchedule || isSaving}
                      >
                        <SelectTrigger id="mealSlot">
                          <SelectValue placeholder="Select meal slot" />
                        </SelectTrigger>
                        <SelectContent>
                          {MEAL_SLOT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label htmlFor="specialInstructions">Special instructions</Label>
                    <textarea
                      id="specialInstructions"
                      rows={4}
                      value={form.specialInstructions}
                      onChange={(event) => setForm((current) => ({ ...current, specialInstructions: event.target.value }))}
                      disabled={!canEdit || isSaving}
                      placeholder="Gate entry notes, serving instructions, escalation notes…"
                      className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-sm transition-colors placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="rounded-xl border border-border bg-surface p-5">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-brand-600" />
                    <h3 className="text-base font-semibold text-text-primary">Customer and location</h3>
                  </div>

                  <div className="mt-4 space-y-4 text-sm">
                    <div className="rounded-lg border border-border bg-surface-secondary p-4">
                      <p className="font-semibold text-text-primary">{order.customer.name}</p>
                      {order.customer.corporateAccount?.companyName && (
                        <p className="mt-1 text-text-secondary">
                          Account: {order.customer.corporateAccount.companyName}
                        </p>
                      )}
                      <div className="mt-3 space-y-2 text-text-secondary">
                        <p className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5" />
                          {order.customer.phone}
                        </p>
                        <p className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5" />
                          {order.customer.email || "No email provided"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-surface-secondary p-4">
                      <p className="font-semibold text-text-primary">{order.location.name}</p>
                      <p className="mt-2 flex items-start gap-2 text-text-secondary">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{order.location.address || "No location address available"}</span>
                      </p>
                      {customerAddress && (
                        <div className="mt-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-secondary">
                          Delivery contact address: {customerAddress.label} · {customerAddress.address}, {customerAddress.city} {customerAddress.pincode}
                        </div>
                      )}
                      {(order.location.contactPerson || order.location.contactPhone) && (
                        <div className="mt-3 text-xs text-text-secondary">
                          {order.location.contactPerson && <p>Contact: {order.location.contactPerson}</p>}
                          {order.location.contactPhone && <p>Phone: {order.location.contactPhone}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-border bg-surface p-5">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-brand-600" />
                    <h3 className="text-base font-semibold text-text-primary">Payment and delivery</h3>
                  </div>

                  <div className="mt-4 space-y-4 text-sm">
                    <div className="rounded-lg border border-border bg-surface-secondary p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary">Payment status</span>
                        <span className="font-semibold text-text-primary">{order.paymentStatus}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-text-secondary">Payment method</span>
                        <span className="font-semibold text-text-primary">{order.paymentMethod || "Not set"}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-text-secondary">Payments recorded</span>
                        <span className="font-semibold text-text-primary">{order.payments.length}</span>
                      </div>
                    </div>

                    {order.payments.length > 0 && (
                      <div className="space-y-2">
                        {order.payments.map((payment) => (
                          <div key={payment.id} className="rounded-lg border border-border bg-surface-secondary p-3">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-text-primary">{payment.method}</p>
                              <p className="text-xs font-semibold uppercase text-text-secondary">{payment.status}</p>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs text-text-secondary">
                              <span>{payment.razorpayPaymentId || payment.id}</span>
                              <span>{formatCurrency(payment.amount)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="rounded-lg border border-border bg-surface-secondary p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary">Delivery status</span>
                        <span className="font-semibold text-text-primary">{order.delivery?.status || "Not assigned"}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-text-secondary">Pickup</span>
                        <span className="font-semibold text-text-primary">{formatDateTime(order.delivery?.pickupTime)}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-text-secondary">Delivered</span>
                        <span className="font-semibold text-text-primary">{formatDateTime(order.delivery?.deliveryTime ?? order.deliveredAt)}</span>
                      </div>
                      {order.delivery?.notes && (
                        <p className="mt-3 text-xs text-text-secondary">{order.delivery.notes}</p>
                      )}
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-border bg-surface p-5">
                  <div className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4 text-brand-600" />
                    <h3 className="text-base font-semibold text-text-primary">Ops notes</h3>
                  </div>

                  <div className="mt-4 space-y-3 text-sm text-text-secondary">
                    <div className="rounded-lg border border-border bg-surface-secondary p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Order type</p>
                      <p className="mt-1 font-medium text-text-primary">{order.type}</p>
                    </div>

                    {order.cancelReason && (
                      <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-danger-700">
                        <p className="text-xs font-semibold uppercase tracking-wide">Cancel reason</p>
                        <p className="mt-1">{order.cancelReason}</p>
                      </div>
                    )}

                    {order.feedback ? (
                      <div className="rounded-lg border border-border bg-surface-secondary p-4">
                        <p className="font-medium text-text-primary">Feedback rating: {order.feedback.rating}/5</p>
                        {order.feedback.comment && (
                          <p className="mt-1 text-text-secondary">{order.feedback.comment}</p>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border p-4 text-text-tertiary">
                        No customer feedback recorded.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>

            {isCancellable(order.status) && canEdit && (
              <section className="rounded-xl border border-warning-200 bg-warning-50 p-5">
                <div className="flex items-center gap-2">
                  <Ban className="h-4 w-4 text-warning-700" />
                  <h3 className="text-base font-semibold text-warning-900">Cancel order</h3>
                </div>
                <p className="mt-2 text-sm text-warning-800">
                  Only pending or confirmed orders can be cancelled from this screen.
                </p>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="cancelReason">Cancellation reason</Label>
                  <textarea
                    id="cancelReason"
                    rows={3}
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                    disabled={isSaving}
                    placeholder="Customer cancelled, kitchen capacity issue, duplicate order…"
                    className="w-full rounded-md border border-warning-300 bg-white px-3 py-2 text-sm text-text-primary shadow-sm transition-colors placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-warning-500 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </section>
            )}

            <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {nextApiStatus && canEdit && (
                  <Button type="button" onClick={handleAdvance} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {nextActionLabel}
                  </Button>
                )}

                {isCancellable(order.status) && canEdit && (
                  <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                    Cancel order
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                  Close
                </Button>
                <Button type="submit" disabled={!canEdit || !formDirty || isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save changes
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function OrdersPage() {
  const { can } = useAuth();
  const [orders, setOrders] = useState<BulkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("All");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const today = getLocalDateKey();
  const canEditOrders = can("orders:edit");

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getOrders({
        dateFrom: today,
        dateTo: today,
        pageSize: 200,
      });
      setOrders((response.data ?? []).map(mapApiOrder).filter(Boolean) as BulkOrder[]);
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [today]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const accountNames = ["All", ...Array.from(new Set(orders.map((order) => order.account)))];

  const filteredOrders = orders.filter((order) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      order.account.toLowerCase().includes(query) ||
      order.orderNumber.toLowerCase().includes(query) ||
      order.menuSummary.toLowerCase().includes(query) ||
      order.location.toLowerCase().includes(query);
    const matchesAccount = accountFilter === "All" || order.account === accountFilter;
    return matchesSearch && matchesAccount;
  });

  async function advanceOrder(id: string) {
    if (!canEditOrders) return;
    const order = orders.find((item) => item.id === id);
    if (!order) return;
    const nextUiStatus = STATUS_NEXT[order.status];
    if (!nextUiStatus) return;
    const nextApiStatus = UI_STATUS_MAP[nextUiStatus];

    setOrders((current) => current.map((item) => (item.id === id ? { ...item, status: nextUiStatus } : item)));
    try {
      await updateOrderStatus(id, nextApiStatus);
    } catch {
      setOrders((current) => current.map((item) => (item.id === id ? { ...item, status: order.status } : item)));
      toast.error(`Failed to move ${order.orderNumber}`);
    }
  }

  const totalMealsToday = orders.reduce((sum, order) => sum + order.mealsBooked, 0);
  const stats = {
    new: orders.filter((order) => order.status === "new").length,
    active: orders.filter((order) => ["confirmed", "preparing", "ready"].includes(order.status)).length,
    dispatched: orders.filter((order) => order.status === "dispatched").length,
    totalMeals: totalMealsToday,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Meal Orders</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Bulk corporate and institutional orders. Open an order for full details, notes, status changes, and cancellation controls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadOrders()}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </button>
          <div className="flex rounded-lg border border-border bg-surface">
            <button
              onClick={() => setViewMode("kanban")}
              className={cn(
                "rounded-l-lg px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === "kanban"
                  ? "bg-brand-500 text-white"
                  : "text-text-secondary hover:bg-surface-secondary",
              )}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded-r-lg px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === "list"
                  ? "bg-brand-500 text-white"
                  : "text-text-secondary hover:bg-surface-secondary",
              )}
            >
              List
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "New Orders", value: stats.new, color: "text-info-600", bg: "bg-info-50", icon: Flame },
          { label: "In Production", value: stats.active, color: "text-brand-600", bg: "bg-brand-50", icon: RefreshCw },
          { label: "Dispatched", value: stats.dispatched, color: "text-purple-600", bg: "bg-purple-50", icon: Truck },
          { label: "Total Meals Today", value: stats.totalMeals, color: "text-success-600", bg: "bg-success-50", icon: UtensilsCrossed },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", stat.bg)}>
                <Icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <div>
                <p className="text-xl font-bold text-text-primary">{stat.value}</p>
                <p className="text-xs text-text-secondary">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by account, order number, menu, or location..."
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-4 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-text-tertiary" />
          <select
            value={accountFilter}
            onChange={(event) => setAccountFilter(event.target.value)}
            className="rounded-lg border border-border bg-surface py-2 pl-3 pr-8 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
          >
            {accountNames.map((account) => (
              <option key={account}>{account}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-tertiary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading orders…
        </div>
      )}

      {!isLoading && viewMode === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => {
            const columnOrders = filteredOrders.filter((order) => order.status === column.id);
            return (
              <div key={column.id} className="flex w-72 shrink-0 flex-col gap-3">
                <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", column.dot)} />
                    <span className="text-sm font-semibold text-text-primary">{column.label}</span>
                  </div>
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-secondary px-1.5 text-[10px] font-bold text-text-secondary">
                    {columnOrders.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {columnOrders.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border py-8 text-center text-xs text-text-tertiary">
                      No orders
                    </div>
                  ) : (
                    columnOrders.map((order) => (
                      <BulkOrderCard
                        key={order.id}
                        order={order}
                        canAdvance={canEditOrders}
                        onAdvance={(id) => void advanceOrder(id)}
                        onView={setSelectedOrderId}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : !isLoading ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                {["Order", "Account", "Meal Type", "Meals", "Total", "Status", "Dispatch By", "Action"].map((column) => (
                  <th key={column} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.map((order) => {
                const column = COLUMNS.find((item) => item.id === order.status);
                const nextStatus = STATUS_NEXT[order.status];
                return (
                  <tr key={order.id} className="transition-colors hover:bg-surface-secondary">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedOrderId(order.id)}
                        className="text-left text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700"
                      >
                        {order.orderNumber}
                      </button>
                      <Link
                        href={`/orders/${order.id}`}
                        className="block text-xs text-text-tertiary hover:text-brand-600 hover:underline mt-0.5"
                      >
                        View Details →
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-text-primary">{order.account}</div>
                      <div className="text-xs text-text-tertiary">{order.location}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{order.mealType}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-text-primary">{order.mealsBooked}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-text-primary">{formatCurrency(order.total)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold", column?.color)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", column?.dot)} />
                        {column?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-text-tertiary">{order.dispatchBy}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedOrderId(order.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-surface"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {nextStatus && canEditOrders ? (
                          <button
                            onClick={() => void advanceOrder(order.id)}
                            className="flex items-center gap-1 rounded-lg bg-brand-500 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-brand-600"
                          >
                            <ChevronDown className="h-3 w-3" />
                            Advance
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="py-12 text-center">
              <UtensilsCrossed className="mx-auto mb-3 h-8 w-8 text-text-tertiary" />
              <p className="text-sm text-text-secondary">
                {orders.length === 0 ? "No orders yet. Orders appear here when placed." : "No orders match your filters."}
              </p>
            </div>
          )}
        </div>
      ) : null}

      <OrderDetailDialog
        orderId={selectedOrderId}
        open={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        onOrderChanged={loadOrders}
      />
    </div>
  );
}
