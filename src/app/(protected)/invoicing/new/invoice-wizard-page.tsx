"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  Calendar,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getMealSummary,
  generateMonthlyInvoice,
  getInvoicePdfUrl,
  getCorporateAccounts,
  type MealSummary,
  type GeneratedInvoice,
  type ApiCorporateAccount,
} from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);
}

function prevMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── Step indicator ─────────────────────────────────────────────────────
function Steps({ current }: { current: number }) {
  const steps = ["Select Account", "Preview", "Generate"];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-0 flex-1">
          <div className="flex flex-col items-center">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                i < current
                  ? "bg-green-500 text-white"
                  : i === current
                  ? "bg-orange-500 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {i < current ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
            </div>
            <span
              className={`text-xs mt-1 font-medium ${
                i === current ? "text-orange-600" : "text-gray-400"
              }`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 mb-4 ${
                i < current ? "bg-green-400" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────
export function InvoiceWizardPage() {
  const [step, setStep] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(prevMonth());
  const [summary, setSummary] = useState<MealSummary | null>(null);
  const [generatedInvoice, setGeneratedInvoice] = useState<GeneratedInvoice | null>(null);
  const [loading, setLoading] = useState(false);

  // Load corporate accounts
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ["corporate-accounts"],
    queryFn: () => getCorporateAccounts(),
    staleTime: 5 * 60 * 1000,
  });

  const accounts: ApiCorporateAccount[] = (accountsData as any)?.data ?? accountsData ?? [];
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  void selectedAccount; // used for potential future display

  // ── Step 0 → 1: Load preview ───────────────────────────────────────
  async function handlePreview() {
    if (!selectedAccountId || !selectedMonth) {
      toast.error("Please select an account and billing period");
      return;
    }
    setLoading(true);
    try {
      const s = await getMealSummary(selectedAccountId, selectedMonth);
      setSummary(s);
      setStep(1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load summary");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 1 → 2: Generate invoice ──────────────────────────────────
  async function handleGenerate() {
    if (!selectedAccountId || !selectedMonth) return;
    setLoading(true);
    try {
      const inv = await generateMonthlyInvoice(selectedAccountId, selectedMonth);
      if (!inv) {
        toast.info("No unbilled delivered services found for this period");
        setGeneratedInvoice(null);
        setStep(0);
        return;
      }
      setGeneratedInvoice(inv);
      setStep(2);
      toast.success(`Invoice ${inv.invoiceNumber} generated!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate invoice");
    } finally {
      setLoading(false);
    }
  }

  // ── Reset ──────────────────────────────────────────────────────────
  function handleReset() {
    setStep(0);
    setSelectedAccountId("");
    setSelectedMonth(prevMonth());
    setSummary(null);
    setGeneratedInvoice(null);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <Link
          href="/invoicing"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-3"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Invoicing
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Invoice Generator</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate monthly invoices for corporate accounts
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <Steps current={step} />

        {/* ── STEP 0: Select account ─────────────────────────────── */}
        {step === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Select Account & Billing Period</h2>

            <div className="space-y-5">
              {/* Account selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 className="h-4 w-4 inline mr-1 text-gray-400" />
                  Corporate Account
                </label>
                {accountsLoading ? (
                  <div className="skeleton h-10 rounded-lg" />
                ) : (
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                  >
                    <option value="">— Select a corporate account —</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.companyName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Month picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-1 text-gray-400" />
                  Billing Period
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  max={prevMonth()}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={handlePreview}
                disabled={!selectedAccountId || !selectedMonth || loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 text-sm"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Preview Invoice <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 1: Preview ────────────────────────────────────── */}
        {step === 1 && summary && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{summary.companyName}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Billing period: {summary.month}
                  </p>
                </div>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">
                  Preview
                </span>
              </div>

              {/* Zero meals warning */}
              {summary.totalMeals === 0 && (
                <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-6">
                  <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700">
                    No meals found for this account in this period. The invoice will have zero charges.
                  </p>
                </div>
              )}

              {/* Employee summary table */}
              {summary.employeeSummary.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Employee Meal Summary</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">
                            Employee
                          </th>
                          <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">
                            Meals
                          </th>
                          <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.employeeSummary.map((emp) => (
                          <tr key={emp.customerId} className="border-t border-gray-50">
                            <td className="px-4 py-2.5 text-gray-800">{emp.name}</td>
                            <td className="px-4 py-2.5 text-right text-gray-600">{emp.meals}</td>
                            <td className="px-4 py-2.5 text-right text-gray-800 font-medium">
                              {fmt(emp.totalCost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* GST Breakdown */}
              <div className="border-t border-gray-100 pt-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Invoice Totals</h3>
                <div className="space-y-2 text-sm max-w-xs ml-auto">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Meals</span>
                    <span className="font-medium">{summary.totalMeals}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Gross Amount</span>
                    <span className="font-medium">{fmt(summary.totalCost)}</span>
                  </div>
                  {summary.totalSubsidy > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>Employer Subsidy (−)</span>
                      <span>−{fmt(summary.totalSubsidy)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Taxable Amount</span>
                    <span className="font-medium">{fmt(summary.netPayable)}</span>
                  </div>
                  {summary.cgst > 0 && (
                    <div className="flex justify-between text-gray-400">
                      <span>CGST @ 2.5%</span>
                      <span>{fmt(summary.cgst)}</span>
                    </div>
                  )}
                  {summary.sgst > 0 && (
                    <div className="flex justify-between text-gray-400">
                      <span>SGST @ 2.5%</span>
                      <span>{fmt(summary.sgst)}</span>
                    </div>
                  )}
                  {summary.igst > 0 && (
                    <div className="flex justify-between text-gray-400">
                      <span>IGST @ 5%</span>
                      <span>{fmt(summary.igst)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 flex justify-between text-base font-bold">
                    <span>Grand Total</span>
                    <span className="text-green-700">{fmt(summary.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(0)}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Generate Invoice
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Generated ──────────────────────────────────── */}
        {step === 2 && generatedInvoice && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="h-9 w-9 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invoice Generated!</h2>
            <p className="text-gray-500 mb-1">
              Invoice Number:{" "}
              <span className="font-mono font-bold text-gray-800">
                {generatedInvoice.invoiceNumber}
              </span>
            </p>
            <p className="text-2xl font-bold text-green-700 mb-8">
              {fmt(generatedInvoice.grandTotal ?? generatedInvoice.total)}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              {/* Download PDF */}
              <a
                href={getInvoicePdfUrl(generatedInvoice.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 text-sm"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </a>

              {/* Send email — coming soon */}
              <button
                disabled
                title="Coming soon"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-400 font-medium rounded-lg cursor-not-allowed text-sm"
              >
                Send via Email (Coming Soon)
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/invoicing" className="text-sm text-blue-600 hover:underline">
                View in Invoicing →
              </Link>
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Generate Another Invoice
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
