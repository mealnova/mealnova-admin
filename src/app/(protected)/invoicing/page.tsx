"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { formatCurrency, cn } from "@/lib/utils";
import {
  getInvoices,
  getInvoice,
  getCorporateAccounts,
  createInvoice,
  createCreditNote,
  createCreditNoteAdjustmentRequest,
  getInvoicePdfUrl,
  getBillingPeriod,
  closeBillingPeriod,
  getGstPeriod,
  generateGstFilingBatch,
  markGstFilingBatchFiled,
  submitGstFilingBatch,
  requestGstFilingOtp,
  finalizeGstFilingBatch,
  syncGstFilingBatch,
  getGstFilingBatchExportUrl,
  getGstFilingBatchGstr1ExportUrl,
  getInvoiceAdjustmentRequests,
  submitInvoiceEInvoice,
  cancelInvoiceEInvoice,
  syncInvoiceEInvoice,
  updateInvoiceStatus,
  issueInvoice,
  markInvoicePaid,
  applyInvoiceAdjustmentRequest,
  recordInvoicePayment,
  recordInvoiceRefund,
  createRefundAdjustmentRequest,
  rejectInvoiceAdjustmentRequest,
  cancelInvoice,
  createInvoicePaymentOrder,
  verifyRazorpayPayment,
  type ApiInvoice,
  type ApiInvoiceAdjustmentRequest,
  type ApiBillingPeriod,
  type ApiGstFilingBatch,
  type ApiGstPeriodSummary,
  type ApiCorporateAccount,
} from "@/lib/api";
import {
  Search,
  Plus,
  Download,
  Send,
  Eye,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  IndianRupee,
  Filter,
  X,
  Trash2,
  Loader2,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open(): void };
  }
}

// ── Status config ───────────────────────────────────────────

type DisplayStatus = "draft" | "sent" | "paid" | "partial" | "overdue" | "issued" | "cancelled";

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; icon: React.ElementType }
> = {
  DRAFT: { label: "Draft", bg: "bg-surface-tertiary", text: "text-text-secondary", icon: FileText },
  ISSUED: { label: "Issued", bg: "bg-info-50", text: "text-info-700", icon: Eye },
  SENT: { label: "Sent", bg: "bg-info-50", text: "text-info-600", icon: Send },
  PAID: { label: "Paid", bg: "bg-success-50", text: "text-success-700", icon: CheckCircle2 },
  PARTIAL: { label: "Partial", bg: "bg-warning-50", text: "text-warning-600", icon: Clock },
  OVERDUE: { label: "Overdue", bg: "bg-danger-50", text: "text-danger-600", icon: AlertCircle },
  CANCELLED: { label: "Cancelled", bg: "bg-surface-tertiary", text: "text-text-tertiary", icon: X },
};

function statusCfg(status: string) {
  return STATUS_CONFIG[status.toUpperCase()] ?? STATUS_CONFIG.DRAFT;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// State-machine: only show valid next transitions per current status
const NEXT_ACTIONS: Record<string, Array<{ label: string; status: string; variant: "primary" | "danger" | "default" }>> = {
  DRAFT:   [{ label: "Issue", status: "ISSUED", variant: "primary" }, { label: "Cancel", status: "CANCELLED", variant: "danger" }],
  ISSUED:  [{ label: "Send", status: "SENT", variant: "primary" }],
  SENT:    [{ label: "Mark Paid", status: "PAID", variant: "primary" }],
  PARTIAL: [{ label: "Mark Paid", status: "PAID", variant: "primary" }],
  OVERDUE: [{ label: "Mark Paid", status: "PAID", variant: "primary" }],
  PAID:      [],
  CANCELLED: [],
};

const STATUS_ACTION_FN: Record<string, (id: string) => Promise<ApiInvoice>> = {
  ISSUED:    issueInvoice,
  PAID:      markInvoicePaid,
  CANCELLED: cancelInvoice,
  SENT:      (id) => updateInvoiceStatus(id, "SENT"),
};

function ageDays(dueDate: string, status: string) {
  if (status.toUpperCase() === "PAID" || status.toUpperCase() === "CANCELLED") return 0;
  const diff = Date.now() - new Date(dueDate).getTime();
  return diff > 0 ? Math.floor(diff / 86400000) : 0;
}

function refundableAmountForInvoice(invoice: ApiInvoice) {
  return Math.max(invoice.amountPaid + invoice.creditedAmount - invoice.total, 0);
}

function exportInvoicesCsv(invoices: ApiInvoice[]) {
  const rows = [
    [
      "Invoice Number",
      "Type",
      "Original Invoice",
      "Client",
      "Status",
      "Issue Date",
      "Due Date",
      "Subtotal",
      "GST",
      "Total",
      "Net Paid",
      "Credited",
      "Refundable",
      "Balance Due",
      "IRN Status",
    ],
    ...invoices.map((invoice) => [
      invoice.invoiceNumber,
      invoice.type,
      invoice.originalInvoice?.invoiceNumber ?? "",
      invoice.corporateAccount?.companyName ?? invoice.buyerNameSnapshot ?? "",
      invoice.status,
      invoice.issueDate,
      invoice.dueDate,
      String(invoice.subtotal),
      String(invoice.totalTax),
      String(invoice.total),
      String(invoice.amountPaid),
      String(invoice.creditedAmount),
      String(refundableAmountForInvoice(invoice)),
      String(invoice.balanceDue),
      invoice.eInvoiceStatus,
    ]),
  ];

  const csv = rows
    .map((row) =>
      row
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
}

function openInvoicePdf(invoiceId: string) {
  window.open(getInvoicePdfUrl(invoiceId), "_blank", "noopener,noreferrer");
}

function downloadInvoicePdf(invoiceId: string, invoiceNumber: string) {
  const link = document.createElement("a");
  link.href = getInvoicePdfUrl(invoiceId);
  link.download = `${invoiceNumber}.pdf`;
  link.click();
}

async function loadRazorpay(): Promise<boolean> {
  if (typeof window.Razorpay !== "undefined") {
    return true;
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

function hasSucceededGstSubmission(
  batch: ApiGstFilingBatch,
  action: string,
) {
  return (batch.submissions ?? []).some(
    (submission) => submission.action === action && submission.status === "SUCCEEDED",
  );
}

// ── Line item type for the modal ────────────────────────────

interface LineItem {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
}

let lineCounter = 1;
function newLine(): LineItem {
  return { id: lineCounter++, description: "", quantity: "", unitPrice: "" };
}

// ── Generate Invoice Modal ──────────────────────────────────

type BuyerMode = "corporate" | "ad_hoc";
type ServiceCategory = "MEAL" | "EVENT";

function GenerateInvoiceModal({
  accounts,
  preselectedAccountId,
  onClose,
  onCreated,
}: {
  accounts: ApiCorporateAccount[];
  preselectedAccountId?: string;
  onClose: () => void;
  onCreated: (inv: ApiInvoice) => void;
}) {
  const [buyerMode, setBuyerMode] = useState<BuyerMode>("corporate");
  const [accountId, setAccountId] = useState(preselectedAccountId ?? "");
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>("MEAL");
  const [buyerName, setBuyerName] = useState("");
  const [buyerGstin, setBuyerGstin] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("27-Maharashtra");
  const [paymentTermsDays, setPaymentTermsDays] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [lines, setLines] = useState<LineItem[]>([newLine()]);
  const [subsidyOverride, setSubsidyOverride] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAccount = accounts.find((a) => a.id === accountId);

  useEffect(() => {
    if (!preselectedAccountId) {
      return;
    }
    setBuyerMode("corporate");
    setAccountId(preselectedAccountId);
  }, [preselectedAccountId]);

  useEffect(() => {
    if (!selectedAccount) {
      return;
    }

    setSubsidyOverride(String(selectedAccount.subsidyPerMeal));
    setPlaceOfSupply(`${selectedAccount.stateCode}-${selectedAccount.billingState}`);
    setPaymentTermsDays(String(selectedAccount.paymentTermsDays));
  }, [selectedAccount]);

  function addLine() {
    setLines((prev) => [...prev, newLine()]);
  }

  function removeLine(id: number) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function updateLine(id: number, field: keyof Omit<LineItem, "id">, value: string) {
    setLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, [field]: value } : line)),
    );
  }

  const computed = useMemo(() => {
    const subsidy =
      serviceCategory === "MEAL" ? parseFloat(subsidyOverride) || 0 : 0;
    const supplyCode =
      buyerMode === "corporate"
        ? selectedAccount?.stateCode?.trim() || "27"
        : placeOfSupply.trim().match(/^(\d{2})/)?.[1] || "27";
    const isInterState = supplyCode !== "27";
    const gstRate = serviceCategory === "EVENT" ? 18 : 5;

    let subtotal = 0;
    let totalUnits = 0;
    for (const line of lines) {
      const qty = parseFloat(line.quantity) || 0;
      const rate = parseFloat(line.unitPrice) || 0;
      subtotal += qty * rate;
      totalUnits += qty;
    }

    const discount = Math.min(subsidy * totalUnits, subtotal);
    const taxable = Math.max(subtotal - discount, 0);
    const cgst = isInterState ? 0 : Math.round(taxable * (gstRate / 200) * 100) / 100;
    const sgst = isInterState ? 0 : Math.round(taxable * (gstRate / 200) * 100) / 100;
    const igst = isInterState ? Math.round(taxable * (gstRate / 100) * 100) / 100 : 0;

    return {
      subtotal,
      discount,
      taxable,
      cgst,
      sgst,
      igst,
      total: taxable + cgst + sgst + igst,
      totalUnits,
      gstRate,
    };
  }, [buyerMode, lines, placeOfSupply, selectedAccount, serviceCategory, subsidyOverride]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (buyerMode === "corporate" && !accountId) {
      return setError("Please select a corporate account.");
    }
    if (buyerMode === "ad_hoc") {
      if (!buyerName.trim()) return setError("Buyer name is required.");
      if (!buyerAddress.trim()) return setError("Buyer address is required.");
      if (!placeOfSupply.trim()) return setError("Place of supply is required.");
    }
    if (!periodStart || !periodEnd) return setError("Billing period is required.");
    const validLines = lines.filter(
      (line) =>
        line.description.trim() &&
        parseFloat(line.quantity) > 0 &&
        parseFloat(line.unitPrice) > 0,
    );
    if (validLines.length === 0) {
      return setError(
        "Add at least one line item with description, quantity, and rate.",
      );
    }
    if (paymentTermsDays.trim()) {
      const parsedTerms = Number.parseInt(paymentTermsDays, 10);
      if (!Number.isFinite(parsedTerms) || parsedTerms < 0) {
        return setError("Payment terms must be a non-negative number of days.");
      }
    }

    setIsSubmitting(true);
    try {
      const invoice = await createInvoice({
        corporateAccountId: buyerMode === "corporate" ? accountId : undefined,
        buyerName: buyerMode === "ad_hoc" ? buyerName.trim() : undefined,
        buyerGstin:
          buyerMode === "ad_hoc" && buyerGstin.trim()
            ? buyerGstin.trim().toUpperCase()
            : undefined,
        buyerAddress: buyerMode === "ad_hoc" ? buyerAddress.trim() : undefined,
        placeOfSupply: buyerMode === "ad_hoc" ? placeOfSupply.trim() : undefined,
        serviceCategory,
        paymentTermsDays: paymentTermsDays.trim()
          ? Number.parseInt(paymentTermsDays, 10)
          : undefined,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        lines: validLines.map((line) => ({
          description: line.description.trim(),
          quantity: parseFloat(line.quantity),
          unitPrice: parseFloat(line.unitPrice),
        })),
        subsidyPerMeal:
          serviceCategory === "MEAL"
            ? parseFloat(subsidyOverride) || undefined
            : undefined,
        notes: notes.trim() || undefined,
      });
      onCreated(invoice);
    } catch (err: any) {
      setError(err.message || "Failed to generate invoice. Is the API running?");
    } finally {
      setIsSubmitting(false);
    }
  }

  const unitLabel = serviceCategory === "EVENT" ? "units" : "meals";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-text-primary">Generate Invoice</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-secondary">
            <X className="h-4 w-4 text-text-secondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                Buyer Type
              </label>
              <select
                value={buyerMode}
                onChange={(e) => setBuyerMode(e.target.value as BuyerMode)}
                className="w-full rounded-lg border border-border bg-surface py-2 pl-3 pr-4 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              >
                <option value="corporate">Corporate Account</option>
                <option value="ad_hoc">Ad Hoc Buyer</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                Service Category
              </label>
              <select
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value as ServiceCategory)}
                className="w-full rounded-lg border border-border bg-surface py-2 pl-3 pr-4 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              >
                <option value="MEAL">Meal / Catering</option>
                <option value="EVENT">Event / One-Time Service</option>
              </select>
            </div>
          </div>

          {buyerMode === "corporate" ? (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                Corporate Account *
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface py-2 pl-3 pr-4 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select account…</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.companyName}
                    {account.gstin ? ` — ${account.gstin}` : ""}
                  </option>
                ))}
              </select>
              {selectedAccount && (
                <p className="mt-1 text-[11px] text-text-tertiary">
                  Subsidy: {formatCurrency(selectedAccount.subsidyPerMeal)}/{unitLabel === "meals" ? "meal" : "unit"} ·
                  {" "}NET {selectedAccount.paymentTermsDays} days · {selectedAccount.billingCity}
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                  Buyer Name *
                </label>
                <input
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                  placeholder="Event client or one-time buyer"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                  Buyer GSTIN
                </label>
                <input
                  value={buyerGstin}
                  onChange={(e) => setBuyerGstin(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                  placeholder="Optional for B2B buyers"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                  Buyer Address *
                </label>
                <textarea
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                  placeholder="Billing address"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                  Place of Supply *
                </label>
                <input
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                  placeholder="27-Maharashtra"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                  Payment Terms (days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={paymentTermsDays}
                  onChange={(e) => setPaymentTermsDays(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                  placeholder="Defaults from billing settings"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                Period Start *
              </label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                Period End *
              </label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-text-secondary">
                Line Items *
              </label>
              <button
                type="button"
                onClick={addLine}
                className="text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                + Add Row
              </button>
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-text-tertiary">
                      Description
                    </th>
                    <th className="w-24 px-3 py-2 text-right text-[11px] font-semibold uppercase text-text-tertiary">
                      Qty ({unitLabel})
                    </th>
                    <th className="w-28 px-3 py-2 text-right text-[11px] font-semibold uppercase text-text-tertiary">
                      Rate (₹)
                    </th>
                    <th className="w-28 px-3 py-2 text-right text-[11px] font-semibold uppercase text-text-tertiary">
                      Total
                    </th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lines.map((line) => {
                    const qty = parseFloat(line.quantity) || 0;
                    const rate = parseFloat(line.unitPrice) || 0;
                    return (
                      <tr key={line.id}>
                        <td className="px-3 py-2">
                          <input
                            value={line.description}
                            onChange={(e) =>
                              updateLine(line.id, "description", e.target.value)
                            }
                            placeholder={
                              serviceCategory === "EVENT"
                                ? "e.g. Catering services for launch event"
                                : "e.g. Lunch — 1 Mar to 31 Mar"
                            }
                            className="w-full rounded border border-border bg-transparent px-2 py-1 text-sm focus:border-brand-400 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(line.id, "quantity", e.target.value)
                            }
                            className="w-full rounded border border-border bg-transparent px-2 py-1 text-right text-sm focus:border-brand-400 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={line.unitPrice}
                            onChange={(e) =>
                              updateLine(line.id, "unitPrice", e.target.value)
                            }
                            className="w-full rounded border border-border bg-transparent px-2 py-1 text-right text-sm focus:border-brand-400 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-medium text-text-primary">
                          {formatCurrency(qty * rate)}
                        </td>
                        <td className="px-3 py-2">
                          {lines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLine(line.id)}
                              className="text-text-tertiary hover:text-danger-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {serviceCategory === "MEAL" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                Employer Subsidy (₹ per meal)
              </label>
              <input
                type="number"
                min="0"
                value={subsidyOverride}
                onChange={(e) => setSubsidyOverride(e.target.value)}
                placeholder="From account settings"
                className="w-40 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-text-tertiary">
                Deducted from subtotal before GST is applied.
              </p>
            </div>
          )}

          <div className="space-y-1.5 rounded-lg border border-border bg-surface-secondary p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">
                Subtotal ({computed.totalUnits} {unitLabel})
              </span>
              <span className="font-medium text-text-primary">
                {formatCurrency(computed.subtotal)}
              </span>
            </div>
            {computed.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-text-secondary">
                  Employer Subsidy (₹{subsidyOverride}/{unitLabel.slice(0, -1)} × {computed.totalUnits})
                </span>
                <span className="font-medium text-danger-600">
                  −{formatCurrency(computed.discount)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-1.5">
              <span className="text-text-secondary">Net Taxable</span>
              <span className="font-medium text-text-primary">
                {formatCurrency(computed.taxable)}
              </span>
            </div>
            {computed.cgst > 0 && (
              <div className="flex justify-between text-xs text-text-tertiary">
                <span>CGST @ {(computed.gstRate / 2).toFixed(1)}%</span>
                <span>{formatCurrency(computed.cgst)}</span>
              </div>
            )}
            {computed.sgst > 0 && (
              <div className="flex justify-between text-xs text-text-tertiary">
                <span>SGST @ {(computed.gstRate / 2).toFixed(1)}%</span>
                <span>{formatCurrency(computed.sgst)}</span>
              </div>
            )}
            {computed.igst > 0 && (
              <div className="flex justify-between text-xs text-text-tertiary">
                <span>IGST @ {computed.gstRate}%</span>
                <span>{formatCurrency(computed.igst)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-1.5 font-bold">
              <span className="text-text-primary">Grand Total</span>
              <span className="text-brand-600">{formatCurrency(computed.total)}</span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Payment terms: NET 30 days from invoice date"
              className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-2 text-sm text-danger-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Generate Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreditNoteModal({
  invoice,
  onClose,
  onCreated,
}: {
  invoice: ApiInvoice;
  onClose: () => void;
  onCreated: () => void;
}) {
  const remainingCreditable = Math.max(
    invoice.total - invoice.creditedAmount,
    0,
  );
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [releaseConsumptions, setReleaseConsumptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requiresAdjustmentRequest = invoice.gstAdjustmentRequired === true;
  const sourceFiledMonth = invoice.sourceFiledGstMonth ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError("Reason is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (requiresAdjustmentRequest) {
        await createCreditNoteAdjustmentRequest(invoice.id, {
          reason: reason.trim(),
          amount: amount.trim() ? parseFloat(amount) : undefined,
          effectiveDate: issueDate
            ? new Date(`${issueDate}T00:00:00.000Z`).toISOString()
            : undefined,
          releaseConsumptions,
        });
      } else {
        await createCreditNote(invoice.id, {
          reason: reason.trim(),
          amount: amount.trim() ? parseFloat(amount) : undefined,
          issueDate: issueDate ? new Date(`${issueDate}T00:00:00.000Z`).toISOString() : undefined,
          releaseConsumptions,
        });
      }
      onCreated();
    } catch (err: any) {
      setError(
        err.message ||
          (requiresAdjustmentRequest
            ? "Failed to create GST adjustment request."
            : "Failed to create credit note."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              {requiresAdjustmentRequest ? "Request GST Credit Adjustment" : "Create Credit Note"}
            </h2>
            <p className="mt-0.5 text-xs text-text-tertiary">
              Against {invoice.invoiceNumber} · Remaining creditable {formatCurrency(remainingCreditable)}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-secondary">
            <X className="h-4 w-4 text-text-secondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
              Reason *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Explain why the invoice is being credited"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
              Credit Amount (optional)
            </label>
            <input
              type="number"
              min="0.01"
              max={remainingCreditable}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Leave blank for full ${formatCurrency(remainingCreditable)}`}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
              {requiresAdjustmentRequest ? "Requested Amendment Date" : "Credit Note Date"}
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-text-tertiary">
              {requiresAdjustmentRequest && sourceFiledMonth
                ? `Original invoice month ${sourceFiledMonth} is already filed. This request will stay pending until finance applies the amendment into an open period.`
                : "Credit notes cannot be posted into a GST month that is already filed."}
            </p>
          </div>

          {invoice.amountPaid > 0 && (
            <div className="rounded-lg border border-info-200 bg-info-50 px-3 py-3 text-sm text-info-800">
              This invoice already has receipts. If the credit creates an overpayment, record the cash refund as a separate refund allocation after the credit note is issued.
            </div>
          )}

          <label className="flex items-start gap-3 rounded-lg border border-border bg-surface-secondary px-3 py-3">
            <input
              type="checkbox"
              checked={releaseConsumptions}
              disabled={invoice.amountPaid > 0}
              onChange={(e) => setReleaseConsumptions(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-sm text-text-secondary">
              Release billed services back to `READY` for re-billing.
              {invoice.amountPaid > 0
                ? " Disabled because this invoice already has payments."
                : " Use only when this is a full correction and you plan to reissue."}
            </span>
          </label>

          {error && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-danger-600 px-4 py-2 text-sm font-semibold text-white hover:bg-danger-700 disabled:opacity-60"
            >
              {isSubmitting
                ? requiresAdjustmentRequest
                  ? "Requesting…"
                  : "Creating…"
                : requiresAdjustmentRequest
                  ? "Request GST Adjustment"
                  : "Create Credit Note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordPaymentModal({
  invoice,
  onClose,
  onRecorded,
}: {
  invoice: ApiInvoice;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const [amount, setAmount] = useState(String(invoice.balanceDue));
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 16));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await recordInvoicePayment(invoice.id, {
        amount: parseFloat(amount),
        method,
        reference: reference.trim() || undefined,
        paidAt: paidAt ? new Date(paidAt).toISOString() : undefined,
      });
      onRecorded();
    } catch (err: any) {
      setError(err.message || "Failed to record payment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Record Payment</h2>
            <p className="mt-0.5 text-xs text-text-tertiary">
              {invoice.invoiceNumber} · Balance due {formatCurrency(invoice.balanceDue)}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-secondary">
            <X className="h-4 w-4 text-text-secondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
              Amount
            </label>
            <input
              type="number"
              min="0.01"
              max={invoice.balanceDue}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
                <option value="MANUAL">Manual</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                Paid At
              </label>
              <input
                type="datetime-local"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
              Reference
            </label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="UTR / cheque no / internal ref"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-success-600 px-4 py-2 text-sm font-semibold text-white hover:bg-success-700 disabled:opacity-60"
            >
              {isSubmitting ? "Recording…" : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordRefundModal({
  invoice,
  onClose,
  onRecorded,
}: {
  invoice: ApiInvoice;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const refundableAmount = refundableAmountForInvoice(invoice);
  const [amount, setAmount] = useState(String(refundableAmount));
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [refundedAt, setRefundedAt] = useState(new Date().toISOString().slice(0, 16));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requiresAdjustmentRequest = invoice.gstAdjustmentRequired === true;
  const sourceFiledMonth = invoice.sourceFiledGstMonth ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (requiresAdjustmentRequest) {
        await createRefundAdjustmentRequest(invoice.id, {
          amount: parseFloat(amount),
          method,
          reference: reference.trim() || undefined,
          effectiveDate: refundedAt ? new Date(refundedAt).toISOString() : undefined,
          reason: `Refund amendment requested for ${invoice.invoiceNumber}`,
        });
      } else {
        await recordInvoiceRefund(invoice.id, {
          amount: parseFloat(amount),
          method,
          reference: reference.trim() || undefined,
          refundedAt: refundedAt ? new Date(refundedAt).toISOString() : undefined,
        });
      }
      onRecorded();
    } catch (err: any) {
      setError(
        err.message ||
          (requiresAdjustmentRequest
            ? "Failed to create refund adjustment request."
            : "Failed to record refund."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              {requiresAdjustmentRequest ? "Request GST Refund Adjustment" : "Record Refund"}
            </h2>
            <p className="mt-0.5 text-xs text-text-tertiary">
              {invoice.invoiceNumber} · Refundable {formatCurrency(refundableAmount)}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-secondary">
            <X className="h-4 w-4 text-text-secondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
              Amount
            </label>
            <input
              type="number"
              min="0.01"
              max={refundableAmount}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
                <option value="MANUAL">Manual</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                {requiresAdjustmentRequest ? "Requested Refund Date" : "Refunded At"}
              </label>
              <input
                type="datetime-local"
                value={refundedAt}
                onChange={(e) => setRefundedAt(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
              Reference
            </label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="UTR / transfer ref / voucher"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
            {requiresAdjustmentRequest && sourceFiledMonth && (
              <p className="mt-1 text-[11px] text-text-tertiary">
                Original invoice month {sourceFiledMonth} is already filed. Refunds now move through the GST adjustment queue before they are applied.
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-danger-600 px-4 py-2 text-sm font-semibold text-white hover:bg-danger-700 disabled:opacity-60"
            >
              {isSubmitting
                ? requiresAdjustmentRequest
                  ? "Requesting…"
                  : "Recording…"
                : requiresAdjustmentRequest
                  ? "Request GST Refund"
                  : "Record Refund"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InvoiceDetailDrawer({
  invoice,
  loading,
  onClose,
  onInvoiceUpdated,
  onCollectOnlinePayment,
  onRecordPayment,
  onRecordRefund,
}: {
  invoice: ApiInvoice | null;
  loading: boolean;
  onClose: () => void;
  onInvoiceUpdated: (invoiceId: string) => Promise<void>;
  onCollectOnlinePayment: (invoice: ApiInvoice) => Promise<void>;
  onRecordPayment: (invoice: ApiInvoice) => void;
  onRecordRefund: (invoice: ApiInvoice) => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 h-full w-full max-w-xl overflow-y-auto border-l border-border bg-surface shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Invoice Details</h2>
            <p className="mt-0.5 text-xs text-text-tertiary">
              {invoice ? invoice.invoiceNumber : "Loading…"}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-secondary">
            <X className="h-4 w-4 text-text-secondary" />
          </button>
        </div>

        {loading || !invoice ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-tertiary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading invoice…
          </div>
        ) : (
          <div className="space-y-6 p-6">
            {(() => {
              const refundableAmount = refundableAmountForInvoice(invoice);
              return (
                <>
            {invoice.gstAdjustmentRequired && invoice.sourceFiledGstMonth && (
              <div className="rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
                Original invoice month {invoice.sourceFiledGstMonth} is already filed. Credit and refund changes must go through the GST adjustment queue.
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Type", value: invoice.type.replaceAll("_", " ") },
                { label: "Status", value: invoice.status },
                { label: "Posted", value: invoice.postedAt ? fmtDate(invoice.postedAt) : "Not posted" },
                { label: "Balance", value: formatCurrency(invoice.balanceDue) },
                { label: "IRN Status", value: invoice.eInvoiceStatus.replaceAll("_", " ") },
                { label: "IRN", value: invoice.irn ?? "—" },
                ...(invoice.eInvoiceCancelledAt
                  ? [{ label: "IRN Cancelled", value: fmtDate(invoice.eInvoiceCancelledAt) }]
                  : []),
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-surface-secondary px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">{item.label}</p>
                  <p className="mt-1 text-sm font-medium text-text-primary break-all">{item.value}</p>
                </div>
              ))}
            </div>

            {invoice.irn && (
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  onClick={async () => {
                    try {
                      const updated = await syncInvoiceEInvoice(invoice.id);
                      await onInvoiceUpdated(invoice.id);
                      if (updated.eInvoiceStatus === "CANCELLED") {
                        toast.success(`IRN is cancelled for ${invoice.invoiceNumber}`);
                      } else if (updated.eInvoiceError) {
                        toast.error(updated.eInvoiceError);
                      } else {
                        toast.success(`IRN status refreshed for ${invoice.invoiceNumber}`);
                      }
                    } catch (err: any) {
                      toast.error(err.message || "Failed to sync IRN status");
                    }
                  }}
                  className="rounded-lg border border-info-200 bg-info-50 px-4 py-2 text-sm font-semibold text-info-700 hover:bg-info-100"
                >
                  Sync IRN
                </button>
                {invoice.eInvoiceStatus === "SUBMITTED" && !invoice.gstAdjustmentRequired && (
                  <button
                    onClick={async () => {
                      const remarks = window.prompt("IRN cancellation remarks (optional)") ?? "";
                      try {
                        const updated = await cancelInvoiceEInvoice(invoice.id, {
                          remarks: remarks || undefined,
                        });
                        await onInvoiceUpdated(invoice.id);
                        if (updated.eInvoiceStatus === "CANCELLED") {
                          toast.success(`IRN cancelled for ${invoice.invoiceNumber}`);
                        } else if (updated.eInvoiceError) {
                          toast.error(updated.eInvoiceError);
                        } else {
                          toast.success(`IRN cancellation requested for ${invoice.invoiceNumber}`);
                        }
                      } catch (err: any) {
                        toast.error(err.message || "Failed to cancel IRN");
                      }
                    }}
                    className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-2 text-sm font-semibold text-danger-700 hover:bg-danger-100"
                  >
                    Cancel IRN
                  </button>
                )}
                {invoice.eInvoiceStatus === "SUBMITTED" && invoice.gstAdjustmentRequired && (
                  <div className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs font-medium text-warning-800">
                    IRN cancellation is locked because the source GST month is already filed.
                  </div>
                )}
              </div>
            )}

            {invoice.type === "TAX_INVOICE" &&
              (invoice.balanceDue > 0 || refundableAmount > 0.009) &&
              !["DRAFT", "CANCELLED"].includes(invoice.status.toUpperCase()) && (
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    onClick={() => void onCollectOnlinePayment(invoice)}
                    disabled={invoice.balanceDue <= 0}
                    className="rounded-lg border border-info-200 bg-info-50 px-4 py-2 text-sm font-semibold text-info-700 hover:bg-info-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Collect Online Payment
                  </button>
                  <button
                    onClick={() => onRecordPayment(invoice)}
                    disabled={invoice.balanceDue <= 0}
                    className="rounded-lg border border-success-200 bg-success-50 px-4 py-2 text-sm font-semibold text-success-700 hover:bg-success-100"
                  >
                    Record Partial Payment
                  </button>
                  {refundableAmount > 0.009 && (
                    <button
                      onClick={() => onRecordRefund(invoice)}
                      className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-2 text-sm font-semibold text-danger-700 hover:bg-danger-100"
                    >
                      {invoice.gstAdjustmentRequired ? "Request Refund" : "Record Refund"}
                    </button>
                  )}
                </div>
              )}
                </>
              );
            })()}

            <div>
              <h3 className="text-sm font-semibold text-text-primary">Payments</h3>
              <div className="mt-3 space-y-2">
                {(invoice.paymentRecords ?? []).length === 0 ? (
                  <div className="rounded-lg border border-border bg-surface-secondary px-4 py-3 text-sm text-text-tertiary">
                    No payments recorded.
                  </div>
                ) : (
                  invoice.paymentRecords!.map((payment) => (
                    <div key={payment.id} className="rounded-lg border border-border bg-surface-secondary px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {payment.entryType === "REFUND" ? "Refund" : "Receipt"} · {payment.method}
                          </p>
                          <p className="text-xs text-text-tertiary">
                            {fmtDate(payment.paidAt)}{payment.reference ? ` · ${payment.reference}` : ""}
                          </p>
                        </div>
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            payment.entryType === "REFUND"
                              ? "text-danger-700"
                              : "text-success-700",
                          )}
                        >
                          {payment.entryType === "REFUND" ? "−" : ""}
                          {formatCurrency(payment.amount)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-text-primary">Credit Notes</h3>
              <div className="mt-3 space-y-2">
                {(invoice.creditNotes ?? []).length === 0 ? (
                  <div className="rounded-lg border border-border bg-surface-secondary px-4 py-3 text-sm text-text-tertiary">
                    No credit notes issued.
                  </div>
                ) : (
                  invoice.creditNotes!.map((creditNote) => (
                    <div key={creditNote.id} className="rounded-lg border border-border bg-surface-secondary px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-text-primary">{creditNote.invoiceNumber}</p>
                          <p className="text-xs text-text-tertiary">{creditNote.status}</p>
                        </div>
                        <p className="text-sm font-semibold text-warning-700">{formatCurrency(creditNote.total)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-text-primary">GST Adjustment Requests</h3>
              <div className="mt-3 space-y-2">
                {(invoice.adjustmentRequests ?? []).length === 0 ? (
                  <div className="rounded-lg border border-border bg-surface-secondary px-4 py-3 text-sm text-text-tertiary">
                    No GST adjustment requests.
                  </div>
                ) : (
                  invoice.adjustmentRequests!.map((request) => (
                    <div key={request.id} className="rounded-lg border border-border bg-surface-secondary px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {request.type.replaceAll("_", " ")} · {request.status}
                          </p>
                          <p className="text-xs text-text-tertiary">
                            Filed month {request.sourceFiledMonth} · Requested {fmtDate(request.requestedAt)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-warning-700">
                          {formatCurrency(request.amount)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-text-primary">E-Invoice Attempts</h3>
              <div className="mt-3 space-y-2">
                {(invoice.eInvoiceSubmissions ?? []).length === 0 ? (
                  <div className="rounded-lg border border-border bg-surface-secondary px-4 py-3 text-sm text-text-tertiary">
                    No e-invoice submissions recorded.
                  </div>
                ) : (
                  invoice.eInvoiceSubmissions!.map((submission) => (
                    <div key={submission.id} className="rounded-lg border border-border bg-surface-secondary px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {submission.provider.replaceAll("_", " ")}
                          </p>
                          <p className="text-xs text-text-tertiary">
                            {(submission.action ? `${submission.action.replaceAll("_", " ")} · ` : "") +
                              `${submission.status === "PENDING" ? "QUEUED" : submission.status} · ${fmtDate(submission.submittedAt)}`}
                          </p>
                        </div>
                        {submission.errorMessage && (
                          <p className="max-w-[220px] text-right text-xs text-danger-600">
                            {submission.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────

function InvoicingPageContent() {
  const { can } = useAuth();
  const searchParams = useSearchParams();
  const preselectedAccount = searchParams?.get("account") ?? undefined;
  const action = searchParams?.get("action");
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [accounts, setAccounts] = useState<ApiCorporateAccount[]>([]);
  const [billingPeriod, setBillingPeriod] = useState<ApiBillingPeriod | null>(null);
  const [gstPeriod, setGstPeriod] = useState<ApiGstPeriodSummary | null>(null);
  const [adjustmentRequests, setAdjustmentRequests] = useState<ApiInvoiceAdjustmentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPeriodLoading, setIsPeriodLoading] = useState(true);
  const [isGstLoading, setIsGstLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"invoices" | "runs" | "gst">("invoices");
  const [billingMonth, setBillingMonth] = useState(currentMonth);
  const [gstMonth, setGstMonth] = useState(currentMonth);
  const [showModal, setShowModal] = useState(false);
  const [creditTarget, setCreditTarget] = useState<ApiInvoice | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<ApiInvoice | null>(null);
  const [refundTarget, setRefundTarget] = useState<ApiInvoice | null>(null);
  const [detailInvoice, setDetailInvoice] = useState<ApiInvoice | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  async function refreshInvoices() {
    const invRes = await getInvoices({
      corporateAccountId: preselectedAccount,
    }).catch(() => ({
      data: [] as ApiInvoice[],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
    }));
    setInvoices(invRes.data);
  }

  async function refreshAccounts() {
    const accRes = await getCorporateAccounts().catch(() => ({
      data: [] as ApiCorporateAccount[],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
    }));
    setAccounts(accRes.data);
  }

  async function refreshBillingPeriod() {
    setIsPeriodLoading(true);
    try {
      const period = await getBillingPeriod(billingMonth);
      setBillingPeriod(period);
    } finally {
      setIsPeriodLoading(false);
    }
  }

  async function refreshGstPeriod() {
    setIsGstLoading(true);
    try {
      const period = await getGstPeriod(gstMonth);
      setGstPeriod(period);
    } finally {
      setIsGstLoading(false);
    }
  }

  async function refreshAdjustmentRequests() {
    const requests = await getInvoiceAdjustmentRequests({
      month: gstMonth,
    }).catch(() => [] as ApiInvoiceAdjustmentRequest[]);
    setAdjustmentRequests(requests);
  }

  async function openInvoiceDetail(id: string) {
    setIsDetailLoading(true);
    setDetailInvoice(null);
    try {
      const invoice = await getInvoice(id);
      setDetailInvoice(invoice);
    } catch (err: any) {
      toast.error(err.message || "Failed to load invoice details");
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function refreshInvoiceAfterMutation(id: string) {
    const invoice = await getInvoice(id);
    setDetailInvoice(invoice);
    setInvoices((prev) => prev.map((existing) => (existing.id === invoice.id ? { ...existing, ...invoice } : existing)));
    await Promise.all([refreshGstPeriod(), refreshAdjustmentRequests()]);
  }

  async function collectInvoicePayment(invoice: ApiInvoice) {
    if (invoice.balanceDue <= 0) {
      toast.error("Invoice does not have an outstanding balance");
      return;
    }

    const loaded = await loadRazorpay();
    if (!loaded || typeof window.Razorpay === "undefined") {
      toast.error("Payment gateway unavailable");
      return;
    }

    try {
      const checkout = await createInvoicePaymentOrder(invoice.id);
      if (checkout.supersededPendingOrders > 0) {
        toast.success(
          `Superseded ${checkout.supersededPendingOrders} stale checkout order${checkout.supersededPendingOrders === 1 ? "" : "s"} for ${invoice.invoiceNumber}`,
        );
      }
      const razorpay = new window.Razorpay({
        key: checkout.keyId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: "Hanuman Caterers",
        description: `Invoice ${invoice.invoiceNumber}`,
        order_id: checkout.razorpayOrderId,
        prefill: {
          name:
            invoice.corporateAccount?.companyName ||
            invoice.buyerNameSnapshot ||
            "Invoice customer",
        },
        theme: { color: "#0f766e" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          await verifyRazorpayPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          await refreshInvoices();
          await refreshGstPeriod();
          await refreshAdjustmentRequests();
          await openInvoiceDetail(invoice.id);
          toast.success(`Payment collected for ${invoice.invoiceNumber}`);
        },
      });
      razorpay.open();
    } catch (err: any) {
      toast.error(err.message || "Failed to start invoice payment");
    }
  }

  useEffect(() => {
    setIsLoading(true);
    Promise.all([refreshInvoices(), refreshAccounts()]).finally(() =>
      setIsLoading(false),
    );
  }, [preselectedAccount]);

  useEffect(() => {
    void refreshBillingPeriod();
  }, [billingMonth]);

  useEffect(() => {
    void refreshGstPeriod();
    void refreshAdjustmentRequests();
  }, [gstMonth]);

  // Auto-open modal if arriving from accounts page with ?account=
  useEffect(() => {
    if (action === "create" && preselectedAccount && !isLoading) setShowModal(true);
  }, [action, preselectedAccount, isLoading]);

  if (!can("invoicing:view")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[var(--color-text-secondary)]">You don&apos;t have permission to view invoicing.</p>
      </div>
    );
  }

  const filtered = invoices.filter((inv) => {
    const buyerLabel =
      inv.corporateAccount?.companyName ?? inv.buyerNameSnapshot ?? "";
    const matchSearch =
      !search ||
      buyerLabel.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "all" ||
      inv.status.toUpperCase() === statusFilter.toUpperCase();
    return matchSearch && matchStatus;
  });

  const outstanding = invoices
    .filter(
      (i) =>
        i.type === "TAX_INVOICE" &&
        !["PAID", "CANCELLED"].includes(i.status.toUpperCase()),
    )
    .reduce((s, i) => s + i.balanceDue, 0);

  const overdue = invoices
    .filter((i) => i.type === "TAX_INVOICE" && i.status.toUpperCase() === "OVERDUE")
    .reduce((s, i) => s + i.total, 0);

  const paidThisMonth = invoices
    .filter((i) => i.type === "TAX_INVOICE" && i.status.toUpperCase() === "PAID")
    .reduce((s, i) => s + i.total, 0);

  const draftCount = invoices.filter((i) => i.status.toUpperCase() === "DRAFT").length;

  return (
    <div className="space-y-6">
      {showModal && (
        <GenerateInvoiceModal
          accounts={accounts}
          preselectedAccountId={preselectedAccount}
          onClose={() => setShowModal(false)}
          onCreated={(inv) => {
            setInvoices((prev) => [inv, ...prev]);
            setShowModal(false);
            void refreshBillingPeriod();
            void refreshGstPeriod();
          }}
        />
      )}

      {creditTarget && (
        <CreditNoteModal
          invoice={creditTarget}
          onClose={() => setCreditTarget(null)}
          onCreated={() => {
            setCreditTarget(null);
            void refreshInvoices();
            void refreshBillingPeriod();
            void refreshGstPeriod();
            void refreshAdjustmentRequests();
            toast.success(
              creditTarget.gstAdjustmentRequired
                ? `GST adjustment requested for ${creditTarget.invoiceNumber}`
                : `Credit note created for ${creditTarget.invoiceNumber}`,
            );
          }}
        />
      )}

      {paymentTarget && (
        <RecordPaymentModal
          invoice={paymentTarget}
          onClose={() => setPaymentTarget(null)}
          onRecorded={async () => {
            setPaymentTarget(null);
            await refreshInvoices();
            await refreshGstPeriod();
            if (detailInvoice) {
              await openInvoiceDetail(detailInvoice.id);
            }
            toast.success(`Payment recorded for ${paymentTarget.invoiceNumber}`);
          }}
        />
      )}

      {refundTarget && (
        <RecordRefundModal
          invoice={refundTarget}
          onClose={() => setRefundTarget(null)}
          onRecorded={async () => {
            setRefundTarget(null);
            await refreshInvoices();
            if (detailInvoice) {
              await openInvoiceDetail(detailInvoice.id);
            }
            await refreshGstPeriod();
            await refreshAdjustmentRequests();
            toast.success(
              refundTarget.gstAdjustmentRequired
                ? `Refund adjustment requested for ${refundTarget.invoiceNumber}`
                : `Refund recorded for ${refundTarget.invoiceNumber}`,
            );
          }}
        />
      )}

      {(detailInvoice || isDetailLoading) && (
        <InvoiceDetailDrawer
          invoice={detailInvoice}
          loading={isDetailLoading}
          onClose={() => {
            setDetailInvoice(null);
            setIsDetailLoading(false);
          }}
          onInvoiceUpdated={refreshInvoiceAfterMutation}
          onCollectOnlinePayment={collectInvoicePayment}
          onRecordPayment={(invoice) => setPaymentTarget(invoice)}
          onRecordRefund={(invoice) => setRefundTarget(invoice)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Invoicing & GST</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Generate, track, and manage all invoices with GST compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (filtered.length === 0) return;
              exportInvoicesCsv(filtered);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <Link
            href="/invoicing/receivables"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary"
          >
            <IndianRupee className="h-4 w-4" />
            Aging Report
          </Link>
          <Link
            href="/invoicing/credit-notes"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary"
          >
            <FileText className="h-4 w-4" />
            Credit Notes
          </Link>
          <Link
            href="/invoicing/new"
            className="flex items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-100"
          >
            <FileText className="h-4 w-4" />
            Generate Invoice (Wizard)
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" />
            Generate Invoice
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Outstanding",
            value: isLoading ? "…" : formatCurrency(outstanding),
            sub: "Across all clients",
            icon: IndianRupee,
            color: "text-brand-600",
            bg: "bg-brand-50",
          },
          {
            label: "Overdue Amount",
            value: isLoading ? "…" : formatCurrency(overdue),
            sub: "Past due date",
            icon: AlertCircle,
            color: "text-danger-600",
            bg: "bg-danger-50",
          },
          {
            label: "Collected",
            value: isLoading ? "…" : formatCurrency(paidThisMonth),
            sub: "Paid invoices",
            icon: CheckCircle2,
            color: "text-success-600",
            bg: "bg-success-50",
          },
          {
            label: "Pending Drafts",
            value: isLoading ? "…" : draftCount.toString(),
            sub: "Needs review",
            icon: FileText,
            color: "text-warning-600",
            bg: "bg-warning-50",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4"
            >
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", kpi.bg)}>
                <Icon className={cn("h-5 w-5", kpi.color)} />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">{kpi.value}</p>
                <p className="text-xs font-medium text-text-secondary">{kpi.label}</p>
                <p className="text-[11px] text-text-tertiary">{kpi.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-surface p-1 w-fit">
        {(["invoices", "runs", "gst"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors capitalize",
              activeTab === tab
                ? "bg-brand-500 text-white shadow-sm"
                : "text-text-secondary hover:bg-surface-secondary",
            )}
          >
            {tab === "gst"
              ? "GST Reports"
              : tab === "runs"
                ? "Billing Runs"
                : "All Invoices"}
          </button>
        ))}
      </div>

      {activeTab === "invoices" ? (
        <>
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search client or invoice number…"
                className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-4 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-text-tertiary" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-border bg-surface py-2 pl-3 pr-8 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="ISSUED">Issued</option>
                <option value="SENT">Sent</option>
                <option value="PAID">Paid</option>
                <option value="PARTIAL">Partial</option>
                <option value="OVERDUE">Overdue</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Invoice table */}
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-tertiary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading invoices…
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary">
                    {["Invoice #", "Client", "Period", "Subtotal", "GST", "Total", "Status", "Due Date", "Actions"].map(
                      (col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary"
                        >
                          {col}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center text-sm text-text-tertiary">
                        {invoices.length === 0
                          ? 'No invoices yet. Click "Generate Invoice" to create your first one.'
                          : "No invoices match your search."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((inv) => {
                      const cfg = statusCfg(inv.status);
                      const StatusIcon = cfg.icon;
                      const age = ageDays(inv.dueDate, inv.status);
                      const period = inv.billingPeriodStart && inv.billingPeriodEnd
                        ? `${fmtDate(inv.billingPeriodStart)} – ${fmtDate(inv.billingPeriodEnd)}`
                        : "—";

                      return (
                        <tr
                          key={inv.id}
                          className="transition-colors hover:bg-surface-secondary"
                        >
                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold text-brand-600">
                              {inv.invoiceNumber}
                            </div>
                            <div className="mt-0.5 text-[10px] uppercase tracking-wider text-text-tertiary">
                              {inv.type.replaceAll("_", " ")}
                            </div>
                            {inv.originalInvoice && (
                              <div className="mt-0.5 text-[10px] text-text-tertiary">
                                Against {inv.originalInvoice.invoiceNumber}
                              </div>
                            )}
                            {inv.irn && (
                              <div className="mt-0.5 text-[10px] text-text-tertiary">
                                IRN: {inv.irn.slice(0, 12)}…
                              </div>
                            )}
                            {inv.gstAdjustmentRequired && inv.sourceFiledGstMonth && (
                              <div className="mt-0.5 text-[10px] text-warning-700">
                                Filed GST month: {inv.sourceFiledGstMonth}
                              </div>
                            )}
                            {inv.eInvoiceStatus === "CANCELLED" && (
                              <div className="mt-0.5 text-[10px] text-danger-600">
                                IRN cancelled
                              </div>
                            )}
                            {!inv.irn &&
                              ["FAILED", "PENDING"].includes(inv.eInvoiceStatus) && (
                                <>
                                  <div
                                    className={cn(
                                      "mt-0.5 text-[10px]",
                                      inv.eInvoiceStatus === "FAILED"
                                        ? "text-danger-600"
                                        : "text-info-600",
                                    )}
                                  >
                                    {inv.eInvoiceStatus === "FAILED"
                                      ? "IRN sync failed"
                                      : "IRN sync pending"}
                                  </div>
                                  {inv.eInvoiceStatus === "FAILED" && inv.eInvoiceError && (
                                    <div className="mt-0.5 max-w-[240px] truncate text-[10px] text-danger-500">
                                      {inv.eInvoiceError}
                                    </div>
                                  )}
                                </>
                              )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-text-primary">
                              {inv.corporateAccount?.companyName ?? inv.buyerNameSnapshot ?? "—"}
                            </div>
                            {(inv.corporateAccount?.gstin || inv.buyerGstinSnapshot) && (
                              <div className="text-[11px] text-text-tertiary">
                                GSTIN: {inv.corporateAccount?.gstin ?? inv.buyerGstinSnapshot}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary">{period}</td>
                          <td className="px-4 py-3 text-sm font-medium text-text-primary">
                            {formatCurrency(inv.subtotal)}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary">
                            {formatCurrency(inv.totalTax)}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-text-primary">
                            {formatCurrency(inv.total)}
                            {inv.type === "TAX_INVOICE" && inv.creditedAmount > 0 && (
                              <div className="mt-0.5 text-[10px] font-medium text-warning-700">
                                Credited {formatCurrency(inv.creditedAmount)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                cfg.bg,
                                cfg.text,
                              )}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {cfg.label}
                              {age > 0 && ` · ${age}d`}
                            </span>
                          </td>
                          <td
                            className={cn(
                              "px-4 py-3 text-xs font-medium",
                              inv.status.toUpperCase() === "OVERDUE"
                                ? "text-danger-600"
                                : "text-text-secondary",
                            )}
                          >
                            {fmtDate(inv.dueDate)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => void openInvoiceDetail(inv.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-surface-secondary"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => openInvoicePdf(inv.id)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-surface-secondary">
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => downloadInvoicePdf(inv.id, inv.invoiceNumber)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-surface-secondary">
                                <Download className="h-3.5 w-3.5" />
                              </button>
                              {(NEXT_ACTIONS[inv.status.toUpperCase()] ?? [])
                                .filter((action) => !(action.status === "PAID" && inv.balanceDue <= 0))
                                .map((action) => {
                                const fn = STATUS_ACTION_FN[action.status] ?? ((id: string) => updateInvoiceStatus(id, action.status));
                                return (
                                  <button
                                    key={action.status}
                                    onClick={async () => {
                                      try {
                                        const updated = await fn(inv.id);
                                        setInvoices((prev) =>
                                          prev.map((i) => (i.id === updated.id ? updated : i)),
                                        );
                                        void refreshBillingPeriod();
                                        void refreshGstPeriod();
                                        toast.success(`Invoice ${updated.invoiceNumber} → ${updated.status}`);
                                        if (updated.eInvoiceStatus === "SUBMITTED" && updated.irn) {
                                          toast.success(`IRN synced for ${updated.invoiceNumber}`);
                                        } else if (updated.eInvoiceStatus === "FAILED") {
                                          toast.error(updated.eInvoiceError || "IRN sync failed");
                                        }
                                      } catch (err: any) {
                                        toast.error(err.message || "Action failed");
                                      }
                                    }}
                                    title={action.label}
                                    className={cn(
                                      "flex h-7 items-center justify-center rounded-lg border px-2 text-[11px] font-semibold transition-colors",
                                      action.variant === "primary" && "border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100",
                                      action.variant === "danger"  && "border-danger-200 bg-danger-50 text-danger-600 hover:bg-danger-100",
                                      action.variant === "default" && "border-border bg-surface text-text-secondary hover:bg-surface-secondary",
                                    )}
                                  >
                                    {action.label}
                                  </button>
                                );
                              })}
                              {["TAX_INVOICE", "CREDIT_NOTE"].includes(inv.type) &&
                                !["DRAFT", "CANCELLED"].includes(inv.status.toUpperCase()) &&
                                !!inv.corporateAccount?.gstin &&
                                !["SUBMITTED", "CANCELLED"].includes(inv.eInvoiceStatus) && (
                                  <button
                                    onClick={async () => {
                                      try {
                                        const updated = await submitInvoiceEInvoice(inv.id);
                                        setInvoices((prev) =>
                                          prev.map((i) => (i.id === updated.id ? updated : i)),
                                        );
                                        void refreshGstPeriod();
                                        if (updated.eInvoiceStatus === "SUBMITTED" && updated.irn) {
                                          toast.success(`IRN synced for ${updated.invoiceNumber}`);
                                        } else if (updated.eInvoiceStatus === "FAILED") {
                                          toast.error(updated.eInvoiceError || "IRN sync failed");
                                        } else {
                                          toast.success(`IRN sync requested for ${updated.invoiceNumber}`);
                                        }
                                      } catch (err: any) {
                                        toast.error(err.message || "IRN sync failed");
                                      }
                                    }}
                                    className="flex h-7 items-center justify-center rounded-lg border border-info-200 bg-info-50 px-2 text-[11px] font-semibold text-info-700 transition-colors hover:bg-info-100"
                                  >
                                    {inv.eInvoiceStatus === "FAILED" ? "Retry IRN" : "Submit IRN"}
                                  </button>
                                )}
                              {inv.type === "TAX_INVOICE" &&
                                inv.total - inv.creditedAmount > 0.009 &&
                                !["DRAFT", "CANCELLED"].includes(inv.status.toUpperCase()) && (
                                  <button
                                    onClick={() => setCreditTarget(inv)}
                                    className="flex h-7 items-center justify-center rounded-lg border border-warning-200 bg-warning-50 px-2 text-[11px] font-semibold text-warning-700 transition-colors hover:bg-warning-100"
                                  >
                                    {inv.gstAdjustmentRequired ? "Request Credit" : "Credit"}
                                  </button>
                                )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : activeTab === "runs" ? (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-text-primary">Billing Period Control</p>
              <p className="mt-1 text-xs text-text-tertiary">
                Monthly invoice generation now creates auditable billing runs per corporate account.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
                className="rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
              <button
                onClick={async () => {
                  try {
                    await closeBillingPeriod(billingMonth);
                    await refreshBillingPeriod();
                    toast.success(`Billing period ${billingMonth} closed`);
                  } catch (err: any) {
                    toast.error(err.message || "Failed to close billing period");
                  }
                }}
                disabled={!billingPeriod || billingPeriod.status !== "INVOICES_GENERATED"}
                className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Close Period
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Period Status",
                value: billingPeriod?.status.replaceAll("_", " ") ?? "…",
                sub: billingMonth,
              },
              {
                label: "Completed Runs",
                value: String(billingPeriod?.completedRuns ?? 0),
                sub: `${billingPeriod?.runs.length ?? 0} created`,
              },
              {
                label: "Pending Accounts",
                value: String(billingPeriod?.pendingAccounts ?? 0),
                sub: `${billingPeriod?.totalActiveAccounts ?? 0} active accounts`,
              },
              {
                label: "Failed Runs",
                value: String(billingPeriod?.failedRuns ?? 0),
                sub: "Needs finance review",
              },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-bold text-text-primary">{card.value}</p>
                <p className="mt-1 text-xs text-text-tertiary">{card.sub}</p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            {isPeriodLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-tertiary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading billing runs…
              </div>
            ) : billingPeriod == null || billingPeriod.runs.length === 0 ? (
              <div className="px-4 py-16 text-center text-sm text-text-tertiary">
                No billing runs exist for {billingMonth}. Use the monthly invoice wizard or batch generation to create them.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary">
                    {["Account", "Status", "Services", "Taxable", "Total", "Invoice / Error"].map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {billingPeriod.runs.map((run) => (
                    <tr key={run.id} className="transition-colors hover:bg-surface-secondary">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-text-primary">
                          {run.corporateAccount.companyName}
                        </div>
                        <div className="text-[11px] text-text-tertiary">
                          {run.corporateAccount.billingCity}, {run.corporateAccount.billingState}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-text-primary">
                        {run.status.replaceAll("_", " ")}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {run.totalConsumptions}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {formatCurrency(run.totalTaxableAmount)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-text-primary">
                        {formatCurrency(run.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {run.invoice ? (
                          <div>
                            <div className="font-medium text-brand-600">{run.invoice.invoiceNumber}</div>
                            <div className="text-[11px] text-text-tertiary">
                              {run.invoice.status} · {formatCurrency(run.invoice.total)}
                            </div>
                          </div>
                        ) : (
                          run.errorMessage ?? "No invoice generated"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* GST Tab */
        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-text-primary">GST Filing Workbench</p>
              <p className="mt-1 text-xs text-text-tertiary">
                Posted invoices and credit notes are grouped by filing month and frozen into a GST batch before export.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={gstMonth}
                onChange={(e) => setGstMonth(e.target.value)}
                className="rounded-lg border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
              <button
                onClick={async () => {
                  try {
                    await generateGstFilingBatch(gstMonth);
                    await refreshGstPeriod();
                    await refreshInvoices();
                    toast.success(`GST batch generated for ${gstMonth}`);
                  } catch (err: any) {
                    toast.error(err.message || "Failed to generate GST batch");
                  }
                }}
                className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
              >
                Generate Batch
              </button>
              {gstPeriod?.batch &&
                (() => {
                  const batch = gstPeriod.batch;
                  const providerWorkflowEnabled = batch.filingProvider !== "NONE";
                  const uploadSucceeded = hasSucceededGstSubmission(batch, "UPLOAD");
                  const canSubmitToProvider =
                    providerWorkflowEnabled &&
                    batch.status !== "FILED" &&
                    batch.totalDocuments > 0;
                  const canRequestOtp =
                    providerWorkflowEnabled &&
                    batch.status !== "FILED" &&
                    uploadSucceeded;
                  const canFinalize =
                    providerWorkflowEnabled &&
                    batch.status !== "FILED" &&
                    uploadSucceeded;
                  const canSyncProvider =
                    providerWorkflowEnabled &&
                    (uploadSucceeded || batch.status === "FILED");
                  const canMarkFiledManually =
                    !providerWorkflowEnabled &&
                    batch.status !== "FILED" &&
                    batch.totalDocuments > 0;

                  return (
                    <>
                      {providerWorkflowEnabled && (
                        <>
                          <button
                            onClick={async () => {
                              try {
                                await submitGstFilingBatch(batch.id);
                                await refreshGstPeriod();
                                toast.success(`Submitted GST batch ${batch.month} to provider`);
                              } catch (err: any) {
                                toast.error(err.message || "Failed to submit GST batch");
                              }
                            }}
                            disabled={!canSubmitToProvider}
                            className="rounded-lg border border-info-200 bg-info-50 px-4 py-2 text-sm font-semibold text-info-700 hover:bg-info-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Submit to Provider
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await requestGstFilingOtp(batch.id);
                                await refreshGstPeriod();
                                toast.success(`Requested filing OTP for ${batch.month}`);
                              } catch (err: any) {
                                toast.error(err.message || "Failed to request filing OTP");
                              }
                            }}
                            disabled={!canRequestOtp}
                            className="rounded-lg border border-warning-200 bg-warning-50 px-4 py-2 text-sm font-semibold text-warning-700 hover:bg-warning-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Request OTP
                          </button>
                          <button
                            onClick={async () => {
                              const otp =
                                window.prompt(
                                  "GST filing OTP (leave blank for mock / provider-managed modes)",
                                ) ?? "";
                              try {
                                await finalizeGstFilingBatch(batch.id, {
                                  otp: otp || undefined,
                                  mode: "EVC",
                                });
                                await refreshGstPeriod();
                                await refreshInvoices();
                                await refreshAdjustmentRequests();
                                toast.success(`Finalized GST batch ${batch.month}`);
                              } catch (err: any) {
                                toast.error(err.message || "Failed to finalize GST batch");
                              }
                            }}
                            disabled={!canFinalize}
                            className="rounded-lg border border-success-200 bg-success-50 px-4 py-2 text-sm font-semibold text-success-700 hover:bg-success-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Finalize Filing
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await syncGstFilingBatch(batch.id);
                                await refreshGstPeriod();
                                toast.success(`Synced GST provider status for ${batch.month}`);
                              } catch (err: any) {
                                toast.error(err.message || "Failed to sync GST provider status");
                              }
                            }}
                            disabled={!canSyncProvider}
                            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Sync Provider
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = getGstFilingBatchExportUrl(batch.id);
                          link.download = `gstr1-${batch.month}.csv`;
                          link.click();
                        }}
                        className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-secondary"
                      >
                        Export CSV
                      </button>
                      <button
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = getGstFilingBatchGstr1ExportUrl(batch.id);
                          link.download = `gstr1-${batch.month}.json`;
                          link.click();
                        }}
                        className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-secondary"
                      >
                        Export GSTR-1 Package
                      </button>
                      {!providerWorkflowEnabled && (
                        <button
                          onClick={async () => {
                            try {
                              await markGstFilingBatchFiled(batch.id);
                              await refreshGstPeriod();
                              await refreshInvoices();
                              await refreshAdjustmentRequests();
                              toast.success(`GST batch ${batch.month} marked filed`);
                            } catch (err: any) {
                              toast.error(err.message || "Failed to mark GST batch filed");
                            }
                          }}
                          disabled={!canMarkFiledManually}
                          className="rounded-lg border border-success-200 bg-success-50 px-4 py-2 text-sm font-semibold text-success-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {batch.status === "FILED" ? "Filed" : "Mark Filed Manually"}
                        </button>
                      )}
                    </>
                  );
                })()}
            </div>
            {gstPeriod?.batch?.hasDriftSinceLastUpload && (
              <div className="mt-4 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
                Batch revision {gstPeriod?.batch?.revision} no longer matches the last uploaded revision {gstPeriod?.batch?.lastUploadedRevision ?? "—"}. Upload again before final filing.
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Documents",
                value: isGstLoading ? "…" : String(gstPeriod?.stats.totalDocuments ?? 0),
                sub: `${gstPeriod?.stats.taxInvoices ?? 0} invoices · ${gstPeriod?.stats.creditNotes ?? 0} credit notes`,
                color: "text-brand-600",
              },
              {
                label: "Net Output GST",
                value: isGstLoading ? "…" : formatCurrency(gstPeriod?.stats.totalTaxAmount ?? 0),
                sub: "Tax invoices less credit notes",
                color: "text-success-600",
              },
              {
                label: "IRN Health",
                value: isGstLoading ? "…" : `${gstPeriod?.stats.eInvoiced ?? 0}`,
                sub: `${gstPeriod?.stats.irnPending ?? 0} pending · ${gstPeriod?.stats.irnFailed ?? 0} failed`,
                color: "text-warning-600",
              },
              {
                label: "Batch Status",
                value: isGstLoading ? "…" : gstPeriod?.batch?.status.replaceAll("_", " ") ?? "NOT GENERATED",
                sub: gstPeriod?.batch?.hasDriftSinceLastUpload
                  ? `Revision ${gstPeriod.batch.revision} drifted from uploaded rev ${gstPeriod.batch.lastUploadedRevision ?? "—"}`
                  : gstPeriod?.batch?.providerStatus
                  ? `Provider: ${gstPeriod.batch.providerStatus} · rev ${gstPeriod.batch.revision}`
                  : gstPeriod?.batch?.filingProvider && gstPeriod.batch.filingProvider !== "NONE"
                    ? `Configured: ${gstPeriod.batch.filingProvider.replaceAll("_", " ")} · rev ${gstPeriod.batch.revision}`
                  : gstPeriod?.batch?.filedAt
                    ? `Filed ${fmtDate(gstPeriod.batch.filedAt)} · rev ${gstPeriod.batch.revision}`
                    : gstPeriod?.batch?.generatedAt
                      ? `Generated ${fmtDate(gstPeriod.batch.generatedAt)} · rev ${gstPeriod.batch.revision}`
                      : gstMonth,
                color: "text-text-primary",
              },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  {card.label}
                </p>
                <p className={cn("mt-2 text-2xl font-bold", card.color)}>{card.value}</p>
                <p className="mt-1 text-xs text-text-tertiary">{card.sub}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-text-primary">Month Snapshot</h3>
            <p className="mt-1 text-xs text-text-tertiary">
              Filing period uses `postedAt`, not draft creation time. The GSTR-1 package is derived from immutable posted invoices, credit notes, and applied filed-period amendments.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "B2B", value: gstPeriod?.stats.b2bDocuments ?? 0 },
                { label: "B2C", value: gstPeriod?.stats.b2cDocuments ?? 0 },
                { label: "Net Document Value", value: formatCurrency(gstPeriod?.stats.totalInvoiceAmount ?? 0) },
                { label: "B2B Parties", value: gstPeriod?.gstr1.b2bParties ?? 0 },
                { label: "B2CS Buckets", value: gstPeriod?.gstr1.b2csBuckets ?? 0 },
                { label: "HSN Rows", value: gstPeriod?.gstr1.hsnRows ?? 0 },
                { label: "Credit Notes", value: (gstPeriod?.gstr1.registeredCreditNotes ?? 0) + (gstPeriod?.gstr1.unregisteredCreditNotes ?? 0) },
                { label: "Applied Adjustments", value: gstPeriod?.gstr1.appliedAdjustments ?? 0 },
                { label: "Net Taxable", value: formatCurrency(gstPeriod?.gstr1.netTaxableAmount ?? 0) },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-surface-secondary px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">{item.label}</p>
                  <p className="mt-2 text-lg font-bold text-text-primary">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {gstPeriod?.batch?.submissions?.length ? (
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="border-b border-border bg-surface-secondary px-4 py-3">
                <h3 className="text-sm font-semibold text-text-primary">Provider Submission History</h3>
                <p className="mt-1 text-xs text-text-tertiary">
                  Latest provider-side GST filing actions recorded for this batch.
                </p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary">
                    {["Action", "Provider", "Status", "Submitted", "Completed"].map((col) => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {gstPeriod.batch.submissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-surface-secondary">
                      <td className="px-4 py-3 text-sm text-text-primary">
                        {submission.action.replaceAll("_", " ")}
                        {submission.revision ? ` · rev ${submission.revision}` : ""}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{submission.provider.replaceAll("_", " ")}</td>
                      <td className="px-4 py-3 text-sm font-medium text-text-primary">
                        {(submission.status === "PENDING" ? "QUEUED" : submission.status).replaceAll("_", " ")}
                        {submission.errorMessage && (
                          <div className="mt-0.5 max-w-[280px] truncate text-[10px] text-danger-700">
                            {submission.errorMessage}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{fmtDate(submission.submittedAt)}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{submission.completedAt ? fmtDate(submission.completedAt) : "Pending"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="border-b border-border bg-surface-secondary px-4 py-3">
              <h3 className="text-sm font-semibold text-text-primary">GST Adjustment Queue</h3>
              <p className="mt-1 text-xs text-text-tertiary">
                Filed-period credit and refund changes are routed here before they are applied into an open month.
              </p>
            </div>
            {adjustmentRequests.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-text-tertiary">
                No GST adjustment requests for {gstMonth}.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary">
                    {["Invoice", "Type", "Amount", "Requested", "Source Month", "Status", "Actions"].map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {adjustmentRequests.map((request) => (
                    <tr key={request.id} className="transition-colors hover:bg-surface-secondary">
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-brand-600">
                          {request.invoice?.invoiceNumber ?? request.invoiceId}
                        </div>
                        <div className="text-[11px] text-text-tertiary">
                          {request.invoice?.corporateAccount?.companyName ?? "Unknown client"}
                        </div>
                        {request.reason && (
                          <div className="mt-0.5 max-w-[280px] truncate text-[10px] text-text-tertiary">
                            {request.reason}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {request.type.replaceAll("_", " ")}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-text-primary">
                        {formatCurrency(request.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {fmtDate(request.requestedAt)}
                        <div className="text-[11px] text-text-tertiary">
                          {request.requestedByName || request.requestedByUserId || "System"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {request.sourceFiledMonth}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-text-primary">
                          {request.status.replaceAll("_", " ")}
                        </div>
                        {request.appliedCreditNoteNo && (
                          <div className="text-[11px] text-success-700">
                            {request.appliedCreditNoteNo}
                          </div>
                        )}
                        {request.reviewNotes && (
                          <div className="mt-0.5 max-w-[220px] truncate text-[10px] text-text-tertiary">
                            {request.reviewNotes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {request.status === "PENDING" ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  await applyInvoiceAdjustmentRequest(request.id);
                                  await refreshAdjustmentRequests();
                                  await refreshInvoices();
                                  await refreshGstPeriod();
                                  toast.success(`Applied adjustment for ${request.invoice?.invoiceNumber ?? request.id}`);
                                } catch (err: any) {
                                  toast.error(err.message || "Failed to apply adjustment");
                                }
                              }}
                              className="rounded-lg border border-success-200 bg-success-50 px-3 py-1.5 text-xs font-semibold text-success-700 hover:bg-success-100"
                            >
                              Apply
                            </button>
                            <button
                              onClick={async () => {
                                const note = window.prompt("Reject reason (optional)") ?? "";
                                try {
                                  await rejectInvoiceAdjustmentRequest(request.id, note || undefined);
                                  await refreshAdjustmentRequests();
                                  toast.success(`Rejected adjustment for ${request.invoice?.invoiceNumber ?? request.id}`);
                                } catch (err: any) {
                                  toast.error(err.message || "Failed to reject adjustment");
                                }
                              }}
                              className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-1.5 text-xs font-semibold text-danger-700 hover:bg-danger-100"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-text-tertiary">Closed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            {isGstLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-tertiary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading GST period…
              </div>
            ) : !gstPeriod || gstPeriod.documents.length === 0 ? (
              <div className="px-4 py-16 text-center text-sm text-text-tertiary">
                No posted GST documents found for {gstMonth}.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary">
                    {["Document", "Counterparty", "Posted", "Taxable", "Tax", "Total", "IRN", "Batch"].map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {gstPeriod.documents.map((doc) => (
                    <tr key={doc.id} className="transition-colors hover:bg-surface-secondary">
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-brand-600">{doc.invoiceNumber}</div>
                        <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
                          {doc.type.replaceAll("_", " ")}
                        </div>
                        {doc.originalInvoice && (
                          <div className="text-[10px] text-text-tertiary">
                            Against {doc.originalInvoice.invoiceNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-text-primary">{doc.buyerNameSnapshot || doc.corporateAccount?.companyName || "—"}</div>
                        <div className="text-[11px] text-text-tertiary">{doc.buyerGstinSnapshot || "B2C / no GSTIN"}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {doc.postedAt ? fmtDate(doc.postedAt) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{formatCurrency(doc.taxableAmount)}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{formatCurrency(doc.totalTax)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-text-primary">{formatCurrency(doc.total)}</td>
                      <td className="px-4 py-3">
                        {doc.irn ? (
                          <div className="text-xs font-medium text-success-700">Submitted</div>
                        ) : (
                          <div className={cn("text-xs font-medium", doc.eInvoiceStatus === "FAILED" ? "text-danger-600" : "text-text-tertiary")}>
                            {doc.eInvoiceStatus.replaceAll("_", " ")}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {gstPeriod.batch ? `${gstPeriod.batch.status} · ${gstPeriod.batch.month}` : "Not batched"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function InvoicingPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-text-tertiary">Loading invoicing…</div>}>
      <InvoicingPageContent />
    </Suspense>
  );
}
