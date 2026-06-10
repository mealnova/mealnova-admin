"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency, cn } from "@/lib/utils";
import {
  getCreditNotes,
  getCorporateAccounts,
  type ApiInvoice,
  type ApiCorporateAccount,
} from "@/lib/api";
import {
  ArrowLeft,
  FileX,
  Search,
  Filter,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

// ── Status badge ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  DRAFT:     { label: "Draft",     cls: "bg-gray-100 text-gray-600" },
  ISSUED:    { label: "Issued",    cls: "bg-blue-100 text-blue-700" },
  SENT:      { label: "Sent",      cls: "bg-indigo-100 text-indigo-700" },
  PAID:      { label: "Applied",   cls: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "Cancelled", cls: "bg-red-100 text-red-600" },
  PARTIAL:   { label: "Partial",   cls: "bg-yellow-100 text-yellow-700" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", cfg.cls)}>
      {cfg.label}
    </span>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function CreditNotesPage() {
  const [creditNotes, setCreditNotes] = useState<ApiInvoice[]>([]);
  const [accounts, setAccounts] = useState<ApiCorporateAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");

  useEffect(() => {
    Promise.all([getCreditNotes(), getCorporateAccounts()])
      .then(([cns, accs]) => {
        setCreditNotes(cns.data);
        setAccounts(accs.data);
      })
      .catch(() => toast.error("Failed to load credit notes"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = creditNotes.filter((cn) => {
    if (statusFilter && cn.status !== statusFilter) return false;
    if (accountFilter && cn.corporateAccountId !== accountFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !cn.invoiceNumber.toLowerCase().includes(q) &&
        !cn.corporateAccount?.companyName?.toLowerCase().includes(q) &&
        !(cn.creditNoteReason ?? "").toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/invoicing"
          className="p-2 rounded-lg hover:bg-gray-100 text-[var(--color-text-secondary)]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
            Credit Notes
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Issued adjustments and reversals against tax invoices
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search number, company, reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] w-64"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 pl-3 pr-8 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_CONFIG).map(([val, { label }]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="py-2 pl-3 pr-8 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
          >
            <option value="">All accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>{acc.companyName}</option>
            ))}
          </select>
        </div>

        <span className="ml-auto text-sm text-[var(--color-text-secondary)]">
          {filtered.length} credit note{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-[var(--color-text-secondary)]">
          Loading credit notes…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-text-secondary)]">
          <FileX className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No credit notes found</p>
          <p className="text-sm mt-1">
            Credit notes are created from the invoice detail page when a reversal or adjustment is needed.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-surface)] border-b text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                <th className="px-4 py-3 text-left">Credit Note #</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Original Invoice</th>
                <th className="px-4 py-3 text-left">Reason</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-left">Issue Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((cn) => (
                <tr key={cn.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                    {cn.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {cn.corporateAccount?.companyName ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {cn.originalInvoice ? (
                      <Link
                        href={`/invoicing?id=${cn.originalInvoice.id}`}
                        className="text-[var(--color-primary-500)] hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {cn.originalInvoice.invoiceNumber}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)] max-w-xs">
                    <span className="line-clamp-2">{cn.creditNoteReason ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-[var(--color-primary-500)]">
                    {formatCurrency(cn.total)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={cn.status} />
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {new Date(cn.issueDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/invoicing?id=${cn.id}`}
                      className="p-1.5 rounded hover:bg-gray-100 text-[var(--color-text-secondary)] inline-block"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
