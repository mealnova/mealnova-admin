"use client";

import { useState } from "react";
import Link from "next/link";
import { useOrderDetail, useInitiateRefund } from "@/lib/queries/orders";
import { updateOrderStatus, cancelOrder } from "@/lib/api";
import {
  ChevronLeft,
  Package,
  User,
  MapPin,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  RefreshCw,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

// ── helpers ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-purple-100 text-purple-800",
  READY: "bg-indigo-100 text-indigo-800",
  DISPATCHED: "bg-orange-100 text-orange-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-100 text-gray-800",
};

const PAYMENT_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  PARTIAL: "bg-blue-100 text-blue-800",
  REFUNDED: "bg-gray-100 text-gray-800",
  FAILED: "bg-red-100 text-red-800",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(n);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── component ─────────────────────────────────────────────────────────

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const { data: order, isLoading, isError, refetch } = useOrderDetail(orderId);
  const refundMutation = useInitiateRefund();

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // ── advance status ─────────────────────────────────────────────────
  async function advanceStatus(newStatus: string) {
    if (!order) return;
    setActionLoading(true);
    try {
      await updateOrderStatus(order.id, newStatus);
      await refetch();
      toast.success(`Order status updated to ${newStatus}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  }

  // ── cancel ─────────────────────────────────────────────────────────
  async function handleCancel() {
    if (!order || !cancelReason.trim()) return;
    setActionLoading(true);
    try {
      await cancelOrder(order.id, cancelReason);
      await refetch();
      toast.success("Order cancelled");
      setCancelModalOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel order");
    } finally {
      setActionLoading(false);
    }
  }

  // ── refund ─────────────────────────────────────────────────────────
  async function handleRefund() {
    if (!order) return;
    const payment = order.payments.find((p) => p.status === "PAID");
    if (!payment) return;
    const amount = refundAmount ? parseFloat(refundAmount) : undefined;
    try {
      await refundMutation.mutateAsync({ paymentId: payment.id, amount });
      await refetch();
      toast.success("Refund initiated successfully");
      setRefundModalOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Refund failed");
    }
  }

  // ── loading / error ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="h-32 rounded-2xl bg-gray-200" />
        <div className="h-64 rounded-2xl bg-gray-200" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="p-8 flex flex-col items-center gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-lg font-semibold">Order not found</p>
        <Link href="/orders" className="text-sm text-blue-600 hover:underline">
          Back to orders
        </Link>
      </div>
    );
  }

  const paidPayment = order.payments.find((p) => p.status === "PAID");
  const canRefund =
    !!paidPayment && ["DELIVERED", "CANCELLED"].includes(order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── topbar ─────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Orders
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {order.orderNumber}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {fmtDate(order.deliveryDate)} &middot; {order.mealSlot} &middot;{" "}
              {order.type.replace("_", " ")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-800"
              }`}
            >
              {order.status}
            </span>
            <span
              className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                PAYMENT_COLORS[order.paymentStatus] ??
                "bg-gray-100 text-gray-800"
              }`}
            >
              {order.paymentStatus}
            </span>
          </div>
        </div>
      </div>

      {/* ── action bar ─────────────────────────────────── */}
      {!["DELIVERED", "CANCELLED", "REFUNDED"].includes(order.status) && (
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex flex-wrap gap-2">
          {order.status === "PENDING" && (
            <>
              <button
                onClick={() => void advanceStatus("CONFIRMED")}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" /> Approve
              </button>
              <button
                onClick={() => setCancelModalOpen(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" /> Reject
              </button>
            </>
          )}
          {order.status === "CONFIRMED" && (
            <button
              onClick={() => void advanceStatus("PREPARING")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" /> Start Preparing
            </button>
          )}
          {order.status === "PREPARING" && (
            <button
              onClick={() => void advanceStatus("READY")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Package className="h-4 w-4" /> Mark Ready
            </button>
          )}
          {order.status === "READY" && (
            <button
              onClick={() => void advanceStatus("DISPATCHED")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              <Truck className="h-4 w-4" /> Mark Dispatched
            </button>
          )}
          {["READY", "DISPATCHED"].includes(order.status) && (
            <button
              onClick={() => void advanceStatus("DELIVERED")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Mark Delivered
            </button>
          )}
          {order.status !== "PENDING" && (
            <button
              onClick={() => setCancelModalOpen(true)}
              disabled={actionLoading}
              className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" /> Cancel Order
            </button>
          )}
        </div>
      )}

      {/* ── main content ───────────────────────────────── */}
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── left: items + totals ───────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
                <Package className="h-5 w-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900">Order Items</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left text-xs font-semibold text-gray-500 px-6 py-3">
                      Item
                    </th>
                    <th className="text-center text-xs font-semibold text-gray-500 px-4 py-3">
                      Qty
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">
                      Rate
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">
                      GST
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-t border-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-4 py-4 text-center text-gray-600">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-4 text-right text-gray-600">
                        {fmt(item.unitPrice)}
                      </td>
                      <td className="px-4 py-4 text-right text-gray-500 text-sm">
                        {item.gstRate != null ? `${item.gstRate}%` : "—"}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">
                        {fmt(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* GST Breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">
                Tax Breakdown
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{fmt(order.subtotal)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount</span>
                    <span>&#8722;{fmt(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Taxable Amount</span>
                  <span className="font-medium">{fmt(order.taxableAmount)}</span>
                </div>
                {order.cgst > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>CGST @ 2.5%</span>
                    <span>{fmt(order.cgst)}</span>
                  </div>
                )}
                {order.sgst > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>SGST @ 2.5%</span>
                    <span>{fmt(order.sgst)}</span>
                  </div>
                )}
                {order.igst > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>IGST @ 5%</span>
                    <span>{fmt(order.igst)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 flex justify-between text-base font-bold">
                  <span>Grand Total</span>
                  <span className="text-green-700">{fmt(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Special Instructions */}
            {order.specialInstructions && (
              <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-5">
                <p className="text-sm font-semibold text-yellow-800 mb-1">
                  Special Instructions
                </p>
                <p className="text-sm text-yellow-700">
                  {order.specialInstructions}
                </p>
              </div>
            )}
          </div>

          {/* ── right: info cards ──────────────────── */}
          <div className="space-y-5">
            {/* Customer */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-4 w-4 text-gray-400" />
                <h3 className="font-semibold text-gray-900 text-sm">
                  Customer
                </h3>
              </div>
              <p className="font-medium text-gray-900">{order.customer.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {order.customer.phone}
              </p>
              {order.customer.email && (
                <p className="text-sm text-gray-500">{order.customer.email}</p>
              )}
              {order.customer.corporateAccount && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">
                    Corporate Account
                  </p>
                  <p className="text-sm font-medium text-gray-700">
                    {order.customer.corporateAccount.companyName}
                  </p>
                </div>
              )}
            </div>

            {/* Location */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-4 w-4 text-gray-400" />
                <h3 className="font-semibold text-gray-900 text-sm">
                  Delivery Location
                </h3>
              </div>
              <p className="font-medium text-gray-900">
                {order.location.name}
              </p>
              {order.location.address && (
                <p className="text-sm text-gray-500 mt-1">
                  {order.location.address}
                </p>
              )}
              {order.location.contactPerson && (
                <p className="text-sm text-gray-500 mt-2">
                  Contact: {order.location.contactPerson}
                </p>
              )}
            </div>

            {/* Payment */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-4 w-4 text-gray-400" />
                <h3 className="font-semibold text-gray-900 text-sm">
                  Payment
                </h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Method</span>
                  <span className="font-medium">
                    {order.paymentMethod ?? "Pay Later"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      PAYMENT_COLORS[order.paymentStatus] ?? ""
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                </div>
                {paidPayment && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Amount Paid</span>
                      <span className="font-medium text-green-700">
                        {fmt(paidPayment.amount)}
                      </span>
                    </div>
                    {paidPayment.razorpayPaymentId && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Razorpay ID</span>
                        <span className="font-mono text-xs text-gray-600 truncate max-w-[120px]">
                          {paidPayment.razorpayPaymentId}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Pay Later — copy payment link */}
              {order.paymentMethod === "PAY_LATER" &&
                order.paymentStatus === "PENDING" && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">
                      Customer chose Pay Later.
                    </p>
                    <button
                      className="w-full text-sm px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      onClick={() => {
                        const link = `${window.location.origin}/order?payOrderId=${order.id}`;
                        navigator.clipboard
                          .writeText(link)
                          .then(() =>
                            toast.success("Payment link copied to clipboard!"),
                          )
                          .catch(() => toast.error("Could not copy link"));
                      }}
                    >
                      Copy Payment Link
                    </button>
                  </div>
                )}

              {/* Refund button */}
              {canRefund && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setRefundAmount(String(order.total));
                      setRefundModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 text-sm px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Initiate Refund
                  </button>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-gray-400" />
                <h3 className="font-semibold text-gray-900 text-sm">
                  Timeline
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-700">Order Created</p>
                    <p className="text-xs text-gray-400">
                      {fmtDate(order.createdAt)}
                    </p>
                  </div>
                </div>
                {order.deliveredAt && (
                  <div className="flex gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="font-medium text-gray-700">Delivered</p>
                      <p className="text-xs text-gray-400">
                        {fmtDate(order.deliveredAt)}
                      </p>
                    </div>
                  </div>
                )}
                {order.cancelReason && (
                  <div className="flex gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-red-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="font-medium text-red-700">Cancelled</p>
                      <p className="text-xs text-gray-400">
                        {order.cancelReason}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cancel modal ───────────────────────────────── */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-lg mb-4">Cancel Order</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for cancelling {order.orderNumber}.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Keep Order
              </button>
              <button
                onClick={() => void handleCancel()}
                disabled={!cancelReason.trim() || actionLoading}
                className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Refund modal ───────────────────────────────── */}
      {refundModalOpen && paidPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-lg mb-2">Initiate Refund</h3>
            <p className="text-sm text-gray-500 mb-4">
              Razorpay Payment ID:{" "}
              <span className="font-mono text-xs">
                {paidPayment.razorpayPaymentId ?? paidPayment.id}
              </span>
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Refund Amount (&#8377;)
            </label>
            <input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              max={paidPayment.amount}
              min={1}
              step={0.01}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <p className="text-xs text-gray-400 mt-1">
              Max: {fmt(paidPayment.amount)}
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setRefundModalOpen(false)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleRefund()}
                disabled={refundMutation.isPending}
                className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {refundMutation.isPending ? "Processing..." : "Initiate Refund"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
