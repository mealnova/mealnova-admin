"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  getPurchaseOrder,
  getMatchReport,
  receiveGoods,
  approvePurchaseOrder,
  type ApiPurchaseOrder,
  type ApiMatchReport,
  type ApiGoodsReceipt,
} from "@/lib/api";
import {
  ArrowLeft,
  Loader2,
  Package,
  CheckCircle,
  TrendingUp,
  Truck,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  APPROVED: "bg-blue-100 text-blue-700",
  SENT: "bg-purple-100 text-purple-700",
  PARTIALLY_RECEIVED: "bg-amber-100 text-amber-700",
  FULLY_RECEIVED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-red-100 text-red-600",
};

const GRN_STATUS_STYLES: Record<string, string> = {
  PENDING_QC: "bg-amber-100 text-amber-700",
  QC_PASSED: "bg-emerald-100 text-emerald-700",
  PARTIAL_ACCEPT: "bg-orange-100 text-orange-700",
  QC_FAILED: "bg-red-100 text-red-600",
};

// ── GRN form ──────────────────────────────────────────────────────────────────

interface GRNLineState {
  purchaseOrderItemId: string;
  ingredientId: string;
  ingredientName: string;
  orderedQuantity: number;
  unit: string;
  unitPrice: number;
  receivedQuantity: number;
  rejectedQuantity: number;
  batchNumber: string;
  unitCost: number;
}

function GRNModal({
  po,
  onClose,
  onSuccess,
}: {
  po: ApiPurchaseOrder;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [lines, setLines] = useState<GRNLineState[]>(
    po.items.map((item) => ({
      purchaseOrderItemId: item.id,
      ingredientId: item.ingredientId ?? "",
      ingredientName: item.ingredientName,
      orderedQuantity: item.quantity - item.receivedQty,
      unit: item.unit,
      unitPrice: item.unitPrice,
      receivedQuantity: item.quantity - item.receivedQty,
      rejectedQuantity: 0,
      batchNumber: "",
      unitCost: item.unitPrice,
    })),
  );
  const [deliveryNote, setDeliveryNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!po.locationId) {
      toast.error("PO has no location — set a location before receiving goods");
      return;
    }
    setSaving(true);
    try {
      await receiveGoods({
        purchaseOrderId: po.id,
        locationId: po.locationId,
        deliveryNote: deliveryNote || undefined,
        status: "QC_PASSED",
        items: lines
          .filter((l) => l.receivedQuantity > 0 && l.ingredientId)
          .map((l) => ({
            purchaseOrderItemId: l.purchaseOrderItemId,
            ingredientId: l.ingredientId,
            orderedQuantity: l.orderedQuantity,
            receivedQuantity: l.receivedQuantity,
            rejectedQuantity: l.rejectedQuantity,
            batchNumber: l.batchNumber || undefined,
            unitCost: l.unitCost,
          })),
      });
      toast.success("Goods receipt created — stock updated");
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Failed to receive goods");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Receive Goods</h2>
            <p className="text-sm text-gray-500">{po.poNumber} · {po.supplier.name}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">
            ×
          </button>
        </div>

        <div className="overflow-auto p-6 space-y-4 flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Note / Challan No.</label>
            <input
              type="text"
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              placeholder="Supplier challan number"
              className="h-10 w-full border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                <th className="pb-2 font-medium">Item</th>
                <th className="pb-2 font-medium text-right">Ordered</th>
                <th className="pb-2 font-medium text-right">Received</th>
                <th className="pb-2 font-medium text-right">Rejected</th>
                <th className="pb-2 font-medium">Batch</th>
                <th className="pb-2 font-medium text-right">Unit Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lines.map((line, i) => (
                <tr key={line.purchaseOrderItemId}>
                  <td className="py-2.5 pr-3 font-medium text-gray-900">
                    {line.ingredientName}
                    {!line.ingredientId && (
                      <span className="ml-2 text-xs text-amber-600">(no ingredient linked)</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right text-gray-500">
                    {line.orderedQuantity.toFixed(2)} {line.unit}
                  </td>
                  <td className="py-2.5 text-right pr-2">
                    <input
                      type="number" min={0} step="any"
                      value={line.receivedQuantity}
                      onChange={(e) => setLines((prev) =>
                        prev.map((l, j) => j === i ? { ...l, receivedQuantity: Number(e.target.value) } : l)
                      )}
                      className="h-8 w-24 rounded border border-gray-200 px-2 text-sm text-right focus:outline-none"
                    />
                  </td>
                  <td className="py-2.5 text-right pr-2">
                    <input
                      type="number" min={0} step="any"
                      value={line.rejectedQuantity}
                      onChange={(e) => setLines((prev) =>
                        prev.map((l, j) => j === i ? { ...l, rejectedQuantity: Number(e.target.value) } : l)
                      )}
                      className="h-8 w-24 rounded border border-gray-200 px-2 text-sm text-right focus:outline-none"
                    />
                  </td>
                  <td className="py-2.5 pr-2">
                    <input
                      type="text" placeholder="Batch#"
                      value={line.batchNumber}
                      onChange={(e) => setLines((prev) =>
                        prev.map((l, j) => j === i ? { ...l, batchNumber: e.target.value } : l)
                      )}
                      className="h-8 w-24 rounded border border-gray-200 px-2 text-sm focus:outline-none"
                    />
                  </td>
                  <td className="py-2.5">
                    <input
                      type="number" min={0} step="any"
                      value={line.unitCost}
                      onChange={(e) => setLines((prev) =>
                        prev.map((l, j) => j === i ? { ...l, unitCost: Number(e.target.value) } : l)
                      )}
                      className="h-8 w-24 rounded border border-gray-200 px-2 text-sm text-right focus:outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button onClick={onClose} className="h-9 px-4 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="h-9 px-5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
            Confirm Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function PODetailPage() {
  const params = useParams();
  const poId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? "";

  const [po, setPo] = useState<ApiPurchaseOrder | null>(null);
  const [matchReport, setMatchReport] = useState<ApiMatchReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"items" | "grn" | "match">("items");
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [approvingPO, setApprovingPO] = useState(false);

  const { can } = useAuth();

  const loadPO = async () => {
    try {
      const [poData, match] = await Promise.all([
        getPurchaseOrder(poId),
        getMatchReport(poId).catch(() => null),
      ]);
      setPo(poData);
      setMatchReport(match);
    } catch {
      toast.error("Failed to load purchase order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPO(); }, [poId]);

  const handleApprove = async () => {
    setApprovingPO(true);
    try {
      await approvePurchaseOrder(poId);
      toast.success("PO approved");
      loadPO();
    } catch (e: any) {
      toast.error(e.message || "Failed to approve");
    } finally {
      setApprovingPO(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="p-6">
        <Link href="/procurement" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <p className="mt-4 text-gray-500">Purchase order not found.</p>
      </div>
    );
  }

  const canReceive = ["APPROVED", "SENT", "PARTIALLY_RECEIVED"].includes(po.status);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {showGRNModal && (
        <GRNModal
          po={po}
          onClose={() => setShowGRNModal(false)}
          onSuccess={() => { setShowGRNModal(false); loadPO(); }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/procurement"
            className="h-9 w-9 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 text-gray-500" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900 font-mono">{po.poNumber}</h1>
              <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", STATUS_STYLES[po.status])}>
                {po.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {po.supplier.name} · Expected {fmtDate(po.expectedDate)}
              {po.location && ` · ${po.location.name}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {can("inventory:edit") && po.status === "DRAFT" && (
            <button
              onClick={handleApprove}
              disabled={approvingPO}
              className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {approvingPO ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Approve PO
            </button>
          )}
          {can("inventory:edit") && canReceive && (
            <button
              onClick={() => setShowGRNModal(true)}
              className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 inline-flex items-center gap-2"
            >
              <Truck className="h-4 w-4" />
              Receive Goods
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Value", value: fmtCurrency(po.totalAmount) },
          { label: "Items", value: String(po.items.length) },
          { label: "GRN Count", value: String(po.goodsReceipts?.length ?? 0) },
          { label: "Approved By", value: po.approvedBy?.name ?? "—" },
        ].map((card) => (
          <div key={card.label} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["items", "grn", "match"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors",
              activeTab === t
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-gray-500 hover:text-gray-700",
            )}
          >
            {t === "items" && <Package className="h-3.5 w-3.5" />}
            {t === "grn" && <Truck className="h-3.5 w-3.5" />}
            {t === "match" && <TrendingUp className="h-3.5 w-3.5" />}
            {t === "items" ? "Line Items" : t === "grn" ? "GRN History" : "Match Report"}
          </button>
        ))}
      </div>

      {/* Items tab */}
      {activeTab === "items" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 font-medium">Ingredient</th>
                <th className="px-4 py-3 font-medium text-right">Ordered</th>
                <th className="px-4 py-3 font-medium text-right">Received</th>
                <th className="px-4 py-3 font-medium text-right">Unit Price</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {po.items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.ingredientName}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{item.quantity.toFixed(2)} {item.unit}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn(
                      "font-medium",
                      item.receivedQty >= item.quantity ? "text-emerald-600" : item.receivedQty > 0 ? "text-amber-600" : "text-gray-400"
                    )}>
                      {item.receivedQty.toFixed(2)} {item.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-gray-200 bg-gray-50">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">{fmtCurrency(po.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* GRN History tab */}
      {activeTab === "grn" && (
        <div className="space-y-4">
          {!po.goodsReceipts || po.goodsReceipts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 border border-dashed border-gray-200 rounded-xl">
              <Truck className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p>No goods receipts yet</p>
              {canReceive && (
                <button onClick={() => setShowGRNModal(true)} className="mt-3 text-emerald-600 text-sm font-medium hover:underline">
                  Record first receipt →
                </button>
              )}
            </div>
          ) : (
            po.goodsReceipts.map((grn: ApiGoodsReceipt) => (
              <div key={grn.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-semibold text-gray-900">{grn.receiptNumber}</span>
                    <span className="ml-3 text-xs text-gray-500">
                      {fmtDate(grn.receivedAt)} · {grn.receivedBy?.name ?? "System"}
                    </span>
                    {grn.deliveryNote && <span className="ml-3 text-xs text-gray-400">Challan: {grn.deliveryNote}</span>}
                  </div>
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", GRN_STATUS_STYLES[grn.status])}>
                    {grn.status.replace("_", " ")}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-100">
                      <th className="px-4 py-2 text-left font-medium">Item</th>
                      <th className="px-4 py-2 text-right font-medium">Received</th>
                      <th className="px-4 py-2 text-right font-medium">Rejected</th>
                      <th className="px-4 py-2 text-right font-medium">Unit Cost</th>
                      <th className="px-4 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {grn.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2.5 text-gray-900">{item.ingredient?.name ?? item.ingredientId}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-600">{item.receivedQuantity.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right text-red-500">{item.rejectedQuantity > 0 ? item.rejectedQuantity.toFixed(2) : "—"}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600">{fmtCurrency(item.unitCost)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">{fmtCurrency(item.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      )}

      {/* Match Report tab */}
      {activeTab === "match" && (
        <div>
          {!matchReport ? (
            <div className="text-center py-12 text-gray-500">
              <ClipboardList className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p>No match data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-xs text-gray-500">Ordered Value</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{fmtCurrency(matchReport.summary.totalOrderedValue)}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                  <p className="text-xs text-emerald-600">Accepted Value</p>
                  <p className="text-xl font-bold text-emerald-700 mt-1">{fmtCurrency(matchReport.summary.totalAcceptedValue)}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-xs text-blue-600">Fill Rate</p>
                  <p className="text-xl font-bold text-blue-700 mt-1">{matchReport.summary.overallFillRate}%</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 font-medium">Ingredient</th>
                      <th className="px-4 py-3 font-medium text-right">Ordered</th>
                      <th className="px-4 py-3 font-medium text-right">Accepted</th>
                      <th className="px-4 py-3 font-medium text-right">Gap</th>
                      <th className="px-4 py-3 font-medium text-right">Fill Rate</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {matchReport.lines.map((line) => (
                      <tr key={line.poItemId} className={cn("hover:bg-gray-50", line.status !== "COMPLETE" && "bg-amber-50/40")}>
                        <td className="px-4 py-3 font-medium text-gray-900">{line.ingredientName}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{line.orderedQuantity.toFixed(2)} {line.unit}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600">{line.acceptedQuantity.toFixed(2)} {line.unit}</td>
                        <td className="px-4 py-3 text-right">
                          {line.gapQuantity > 0
                            ? <span className="text-red-600 font-medium">{line.gapQuantity.toFixed(2)} {line.unit}</span>
                            : <span className="text-emerald-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{line.fillRate}%</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            line.status === "COMPLETE" ? "bg-emerald-100 text-emerald-700" :
                            line.status === "PARTIAL" ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-600"
                          )}>
                            {line.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
