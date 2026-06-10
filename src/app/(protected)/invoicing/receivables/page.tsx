"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency, cn } from "@/lib/utils";
import {
  getAgingReport,
  getInvoices,
  type ApiAgingReport,
  type ApiAgingRow,
  type ApiInvoice,
} from "@/lib/api";
import {
  ArrowLeft,
  RefreshCw,
  Building2,
  Mail,
  Phone,
  ChevronRight,
  X,
} from "lucide-react";
import { toast } from "sonner";

// ── Bucket helpers ─────────────────────────────────────────────────────────

const BUCKET_LABELS: { key: keyof ApiAgingRow["buckets"]; label: string; color: string }[] = [
  { key: "current", label: "Current", color: "text-emerald-700 bg-emerald-50" },
  { key: "bucket1to30", label: "1–30 days", color: "text-yellow-700 bg-yellow-50" },
  { key: "bucket31to60", label: "31–60 days", color: "text-orange-700 bg-orange-50" },
  { key: "bucket61to90", label: "61–90 days", color: "text-red-600 bg-red-50" },
  { key: "bucket90plus", label: "90+ days", color: "text-red-800 bg-red-100" },
];

function bucketColor(key: keyof ApiAgingRow["buckets"], amount: number) {
  if (amount === 0) return "text-gray-300";
  const found = BUCKET_LABELS.find((b) => b.key === key);
  return found?.color ?? "";
}

// ── Invoice slide-over ─────────────────────────────────────────────────────

function InvoicePanel({
  accountId,
  companyName,
  onClose,
}: {
  accountId: string;
  companyName: string;
  onClose: () => void;
}) {
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getInvoices({ corporateAccountId: accountId, type: "TAX_INVOICE" })
      .then((res) => setInvoices((res.data ?? []).filter((inv) => inv.balanceDue > 0)))
      .catch(() => toast.error("Failed to load invoices"))
      .finally(() => setLoading(false));
  }, [accountId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="flex-1 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <p className="text-xs text-[var(--color-text-secondary)] font-medium uppercase tracking-wider">
              Outstanding Invoices
            </p>
            <h2 className="font-semibold text-[var(--color-text-primary)]">{companyName}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-[var(--color-text-secondary)]">Loading…</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-text-secondary)]">No outstanding invoices</div>
          ) : (
            invoices.map((inv) => {
              const dueDate = new Date(inv.dueDate);
              const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / 86400000);
              return (
                <div key={inv.id} className="rounded-xl border bg-[var(--color-surface-card)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {inv.invoiceNumber}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                        Due: {dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        {daysOverdue > 0 && (
                          <span className="ml-1.5 text-red-600 font-medium">
                            ({daysOverdue}d overdue)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[var(--color-primary-500)]">
                        {formatCurrency(inv.balanceDue)}
                      </p>
                      <span
                        className={cn(
                          "text-xs px-1.5 py-0.5 rounded font-medium",
                          inv.status === "OVERDUE" && "bg-red-100 text-red-700",
                          inv.status === "PARTIAL" && "bg-yellow-100 text-yellow-700",
                          (inv.status === "ISSUED" || inv.status === "SENT") &&
                            "bg-blue-100 text-blue-700",
                        )}
                      >
                        {inv.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ReceivablesPage() {
  const [report, setReport] = useState<ApiAgingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const load = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getAgingReport();
      setReport(data);
    } catch {
      toast.error("Failed to load aging report");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[var(--color-text-secondary)]">
        Loading aging report…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/invoicing"
            className="p-2 rounded-lg hover:bg-gray-100 text-[var(--color-text-secondary)]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              Accounts Receivable Aging
            </h1>
            {report && (
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                As of {new Date(report.asOf).toLocaleString("en-IN")}
              </p>
            )}
          </div>
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

      {/* Summary totals */}
      {report && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {BUCKET_LABELS.map(({ key, label, color }) => (
            <div key={key} className="rounded-xl border bg-[var(--color-surface-card)] p-4">
              <p className="text-xs text-[var(--color-text-secondary)] mb-1">{label}</p>
              <p className={cn("text-lg font-bold", color.split(" ")[0])}>
                {formatCurrency(report.totals[key])}
              </p>
            </div>
          ))}
          <div className="rounded-xl border bg-[var(--color-surface-dark)] text-white p-4">
            <p className="text-xs text-white/60 mb-1">Total Outstanding</p>
            <p className="text-lg font-bold">{formatCurrency(report.totals.total)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      {report && (
        <div className="rounded-xl border overflow-hidden bg-white">
          {report.rows.length === 0 ? (
            <div className="text-center py-16 text-[var(--color-text-secondary)]">
              No outstanding invoices — all accounts are settled!
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-surface)] border-b text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                  <th className="px-4 py-3 text-left">Company</th>
                  {BUCKET_LABELS.map(({ key, label }) => (
                    <th key={key} className="px-3 py-3 text-right">{label}</th>
                  ))}
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.rows.map((row) => (
                  <tr
                    key={row.corporateAccountId}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      setSelectedAccount({ id: row.corporateAccountId, name: row.companyName })
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[var(--color-text-secondary)] flex-shrink-0" />
                        <div>
                          <p className="font-medium text-[var(--color-text-primary)]">
                            {row.companyName}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                              <Mail className="w-3 h-3" />
                              {row.billingEmail}
                            </span>
                            {row.contactPhone && (
                              <span className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                                <Phone className="w-3 h-3" />
                                {row.contactPhone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    {BUCKET_LABELS.map(({ key }) => (
                      <td key={key} className="px-3 py-3 text-right">
                        <span className={cn("font-medium tabular-nums", bucketColor(key, row.buckets[key]))}>
                          {row.buckets[key] > 0 ? formatCurrency(row.buckets[key]) : "—"}
                        </span>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                        {formatCurrency(row.buckets.total)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-[var(--color-surface)] font-semibold text-[var(--color-text-primary)]">
                  <td className="px-4 py-3 text-xs uppercase tracking-wider">
                    Totals ({report.rows.length} accounts)
                  </td>
                  {BUCKET_LABELS.map(({ key }) => (
                    <td key={key} className="px-3 py-3 text-right tabular-nums">
                      {formatCurrency(report.totals[key])}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(report.totals.total)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* Invoice slide-over */}
      {selectedAccount && (
        <InvoicePanel
          accountId={selectedAccount.id}
          companyName={selectedAccount.name}
          onClose={() => setSelectedAccount(null)}
        />
      )}
    </div>
  );
}
