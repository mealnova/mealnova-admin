"use client";

import { useState, useEffect } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import {
  getCorporateAccounts,
  getCorporateOnboardingRequests,
  reviewCorporateOnboardingRequest,
  createCorporateAccount,
  updateCorporateAccount,
  deleteCorporateAccount,
  getCorporateSlabs,
  saveCorporateSlabs,
  type ApiCorporateAccount,
  type ApiCorporateOnboardingRequest,
  type ReviewStatus,
  type VolumePricingSlab,
} from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import {
  Building2, Plus, Search, Users, IndianRupee, FileText,
  ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Clock,
  Edit, Loader2, X, Trash2, Layers, Mail, PhoneCall, MapPin, Link as LinkIcon,
} from "lucide-react";

// ── Derived status ──────────────────────────────────────────────────────────

type AccountStatus = "active" | "suspended" | "expired";

function deriveStatus(account: ApiCorporateAccount): AccountStatus {
  if (!account.isActive) return "suspended";
  if (new Date(account.contractEnd) < new Date()) return "expired";
  return "active";
}

const STATUS_CONFIG: Record<AccountStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  active:    { label: "Active",    bg: "bg-success-50", text: "text-success-700", icon: CheckCircle2 },
  suspended: { label: "Suspended", bg: "bg-warning-50", text: "text-warning-700", icon: AlertCircle },
  expired:   { label: "Expired",   bg: "bg-danger-50",  text: "text-danger-700",  icon: Clock },
};

const REVIEW_STATUS_CONFIG: Record<ReviewStatus, { label: string; bg: string; text: string }> = {
  PENDING: { label: "Pending", bg: "bg-warning-50", text: "text-warning-700" },
  CHANGES_REQUESTED: { label: "Changes Requested", bg: "bg-blue-50", text: "text-blue-700" },
  APPROVED: { label: "Approved", bg: "bg-success-50", text: "text-success-700" },
  REJECTED: { label: "Rejected", bg: "bg-danger-50", text: "text-danger-700" },
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function toInputDate(iso: string) {
  return iso ? iso.split("T")[0] : "";
}

// ── Account form defaults ────────────────────────────────────────────────────

const EMPTY_FORM = {
  companyName: "", gstin: "", contactPerson: "", contactPhone: "",
  billingEmail: "", billingAddress: "", billingCity: "", billingPincode: "",
  billingState: "Maharashtra", stateCode: "27", paymentTermsDays: "30",
  subsidyPerMeal: "70", maxMealsPerDay: "2", maxMealsPerMonth: "",
  ratePerBreakfast: "0", ratePerLunch: "0", ratePerSnacks: "0", ratePerDinner: "0",
  monthlyBudgetCap: "", contractStart: "", contractEnd: "",
};

type FormState = typeof EMPTY_FORM;

// ── Account Modal ────────────────────────────────────────────────────────────

function AccountModal({
  account,
  onClose,
  onSaved,
}: {
  account: ApiCorporateAccount | null; // null = create
  onClose: () => void;
  onSaved: (a: ApiCorporateAccount) => void;
}) {
  const isEdit = !!account;
  const [form, setForm] = useState<FormState>(() =>
    account
      ? {
          companyName: account.companyName,
          gstin: account.gstin ?? "",
          contactPerson: account.contactPerson ?? "",
          contactPhone: account.contactPhone ?? "",
          billingEmail: account.billingEmail,
          billingAddress: account.billingAddress,
          billingCity: account.billingCity,
          billingPincode: account.billingPincode ?? "",
          billingState: account.billingState,
          stateCode: account.stateCode,
          paymentTermsDays: String(account.paymentTermsDays),
          subsidyPerMeal: String(account.subsidyPerMeal),
          maxMealsPerDay: String(account.maxMealsPerDay),
          maxMealsPerMonth: account.maxMealsPerMonth != null ? String(account.maxMealsPerMonth) : "",
          ratePerBreakfast: String(account.ratePerBreakfast ?? 0),
          ratePerLunch: String(account.ratePerLunch ?? 0),
          ratePerSnacks: String(account.ratePerSnacks ?? 0),
          ratePerDinner: String(account.ratePerDinner ?? 0),
          monthlyBudgetCap: account.monthlyBudgetCap != null ? String(account.monthlyBudgetCap) : "",
          contractStart: toInputDate(account.contractStart),
          contractEnd: toInputDate(account.contractEnd),
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName.trim() || !form.billingEmail.trim() || !form.billingPincode.trim()) {
      toast.error("Company name, billing email, and pincode are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        companyName: form.companyName.trim(),
        gstin: form.gstin.trim() || undefined,
        contactPerson: form.contactPerson.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        billingEmail: form.billingEmail.trim(),
        billingAddress: form.billingAddress.trim(),
        billingCity: form.billingCity.trim(),
        billingPincode: form.billingPincode.trim(),
        billingState: form.billingState.trim(),
        stateCode: form.stateCode.trim(),
        paymentTermsDays: parseInt(form.paymentTermsDays) || 30,
        subsidyPerMeal: parseFloat(form.subsidyPerMeal) || 0,
        maxMealsPerDay: parseInt(form.maxMealsPerDay) || 2,
        maxMealsPerMonth: form.maxMealsPerMonth ? parseInt(form.maxMealsPerMonth) : undefined,
        ratePerBreakfast: parseFloat(form.ratePerBreakfast) || 0,
        ratePerLunch: parseFloat(form.ratePerLunch) || 0,
        ratePerSnacks: parseFloat(form.ratePerSnacks) || 0,
        ratePerDinner: parseFloat(form.ratePerDinner) || 0,
        monthlyBudgetCap: form.monthlyBudgetCap ? parseFloat(form.monthlyBudgetCap) : undefined,
        contractStart: form.contractStart,
        contractEnd: form.contractEnd,
      };
      const saved = isEdit
        ? await updateCorporateAccount(account!.id, payload)
        : await createCorporateAccount(payload);
      toast.success(isEdit ? "Account updated" : `${saved.companyName} added`);
      onSaved(saved);
    } catch (err: any) {
      toast.error(err.message || "Failed to save account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-surface shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <h2 className="text-base font-semibold text-text-primary">
            {isEdit ? `Edit — ${account!.companyName}` : "Add Corporate Account"}
          </h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-5">
          {/* ── Company Details ── */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">Company Details</legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Company Name *</label>
                <input required value={form.companyName} onChange={(e) => set("companyName", e.target.value)}
                  placeholder="BMW TechWorks India Pvt Ltd"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">GSTIN</label>
                <input value={form.gstin} onChange={(e) => set("gstin", e.target.value)}
                  placeholder="27XXXXX..."
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Contact Person</label>
                <input value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)}
                  placeholder="HR Manager"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Contact Phone</label>
                <input value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)}
                  placeholder="+91 98..."
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
              </div>
            </div>
          </fieldset>

          {/* ── Billing Details ── */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">Billing Details</legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Billing Email *</label>
                <input required type="email" value={form.billingEmail} onChange={(e) => set("billingEmail", e.target.value)}
                  placeholder="finance@company.com"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Billing Address</label>
                <input value={form.billingAddress} onChange={(e) => set("billingAddress", e.target.value)}
                  placeholder="Plot No. 1, Tech Park..."
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">City</label>
                <input value={form.billingCity} onChange={(e) => set("billingCity", e.target.value)}
                  placeholder="Pune"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Pincode *</label>
                <input required value={form.billingPincode} onChange={(e) => set("billingPincode", e.target.value)}
                  placeholder="411045"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">State</label>
                <input value={form.billingState} onChange={(e) => set("billingState", e.target.value)}
                  placeholder="Maharashtra"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">State Code</label>
                <input value={form.stateCode} onChange={(e) => set("stateCode", e.target.value)}
                  placeholder="27"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Payment Terms (days)</label>
                <select value={form.paymentTermsDays} onChange={(e) => set("paymentTermsDays", e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none">
                  {["15","30","45","60"].map(d => <option key={d} value={d}>NET {d}</option>)}
                </select>
              </div>
            </div>
          </fieldset>

          {/* ── Meal Configuration ── */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">Meal Configuration</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Subsidy / Meal (₹)</label>
                <input type="number" min="0" step="0.01" value={form.subsidyPerMeal} onChange={(e) => set("subsidyPerMeal", e.target.value)}
                  placeholder="70"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Max Meals / Day</label>
                <input type="number" min="1" value={form.maxMealsPerDay} onChange={(e) => set("maxMealsPerDay", e.target.value)}
                  placeholder="2"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Max Meals / Month</label>
                <input type="number" min="1" value={form.maxMealsPerMonth} onChange={(e) => set("maxMealsPerMonth", e.target.value)}
                  placeholder="22"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Rate per Breakfast (₹)</label>
                <input type="number" min="0" step="0.01" value={form.ratePerBreakfast} onChange={(e) => set("ratePerBreakfast", e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Rate per Lunch (₹)</label>
                <input type="number" min="0" step="0.01" value={form.ratePerLunch} onChange={(e) => set("ratePerLunch", e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Rate per Snacks (₹)</label>
                <input type="number" min="0" step="0.01" value={form.ratePerSnacks} onChange={(e) => set("ratePerSnacks", e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Rate per Dinner (₹)</label>
                <input type="number" min="0" step="0.01" value={form.ratePerDinner} onChange={(e) => set("ratePerDinner", e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Monthly Budget Cap (₹)</label>
                <input type="number" min="0" step="0.01" value={form.monthlyBudgetCap} onChange={(e) => set("monthlyBudgetCap", e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
              </div>
            </div>
          </fieldset>

          {/* ── Contract ── */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">Contract</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Contract Start</label>
                <input type="date" value={form.contractStart} onChange={(e) => set("contractStart", e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Contract End</label>
                <input type="date" value={form.contractEnd} onChange={(e) => set("contractEnd", e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none" />
              </div>
            </div>
          </fieldset>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Confirm Delete Dialog ────────────────────────────────────────────────────

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

// ── Slab Pricing Editor ──────────────────────────────────────────────────────

const MEAL_SLOT_OPTIONS = [
  { value: "", label: "All Slots" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "snacks", label: "Snacks" },
  { value: "dinner", label: "Dinner" },
];

interface SlabRow {
  mealSlot: string | null;
  fromQuantity: number;
  toQuantity: number | null;
  ratePerMeal: number;
}

function SlabPricingEditor({
  accountId,
  accountName,
  onClose,
}: {
  accountId: string;
  accountName: string;
  onClose: () => void;
}) {
  const [slabs, setSlabs] = useState<SlabRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCorporateSlabs(accountId)
      .then((data) =>
        setSlabs(
          data.map((s) => ({
            mealSlot: s.mealSlot,
            fromQuantity: s.fromQuantity,
            toQuantity: s.toQuantity,
            ratePerMeal: s.ratePerMeal,
          })),
        ),
      )
      .catch(() => setSlabs([]))
      .finally(() => setLoading(false));
  }, [accountId]);

  function addSlab() {
    const lastTo =
      slabs.length > 0 ? (slabs[slabs.length - 1].toQuantity ?? 0) : 0;
    setSlabs([
      ...slabs,
      { mealSlot: null, fromQuantity: lastTo + 1, toQuantity: null, ratePerMeal: 0 },
    ]);
  }

  function removeSlab(index: number) {
    setSlabs(slabs.filter((_, i) => i !== index));
  }

  function updateSlab(index: number, field: keyof SlabRow, value: string) {
    setSlabs(
      slabs.map((s, i) => {
        if (i !== index) return s;
        if (field === "mealSlot") {
          return { ...s, mealSlot: value === "" ? null : value };
        }
        if (field === "toQuantity") {
          return { ...s, toQuantity: value === "" ? null : parseInt(value) || 0 };
        }
        if (field === "ratePerMeal") {
          return { ...s, ratePerMeal: parseFloat(value) || 0 };
        }
        if (field === "fromQuantity") {
          return { ...s, fromQuantity: parseInt(value) || 0 };
        }
        return s;
      }),
    );
  }

  async function handleSave() {
    if (slabs.length === 0) {
      toast.error("Add at least one pricing slab");
      return;
    }
    for (let i = 0; i < slabs.length; i++) {
      if (slabs[i].ratePerMeal <= 0) {
        toast.error(`Slab ${i + 1}: rate per meal must be greater than 0`);
        return;
      }
      if (slabs[i].fromQuantity < 1) {
        toast.error(`Slab ${i + 1}: from quantity must be at least 1`);
        return;
      }
    }
    setSaving(true);
    try {
      await saveCorporateSlabs(accountId, slabs);
      toast.success("Pricing slabs saved");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-surface shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Volume Pricing
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">{accountName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 flex-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-tertiary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading slabs...
            </div>
          ) : (
            <>
              {/* Table header */}
              {slabs.length > 0 && (
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_40px] gap-2 mb-2 px-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                    From Qty
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                    To Qty
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                    Rate/Meal
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                    Meal Slot
                  </span>
                  <span />
                </div>
              )}

              {/* Slab rows */}
              <div className="space-y-2">
                {slabs.map((slab, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[1fr_1fr_1fr_1fr_40px] gap-2 items-center"
                  >
                    <input
                      type="number"
                      min="1"
                      value={slab.fromQuantity}
                      onChange={(e) =>
                        updateSlab(index, "fromQuantity", e.target.value)
                      }
                      placeholder="1"
                      className={inputClass}
                    />
                    <input
                      type="number"
                      min="1"
                      value={slab.toQuantity ?? ""}
                      onChange={(e) =>
                        updateSlab(index, "toQuantity", e.target.value)
                      }
                      placeholder="Unlimited"
                      className={inputClass}
                    />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={slab.ratePerMeal || ""}
                        onChange={(e) =>
                          updateSlab(index, "ratePerMeal", e.target.value)
                        }
                        placeholder="120"
                        className={cn(inputClass, "pl-7")}
                      />
                    </div>
                    <select
                      value={slab.mealSlot ?? ""}
                      onChange={(e) =>
                        updateSlab(index, "mealSlot", e.target.value)
                      }
                      className={inputClass}
                    >
                      {MEAL_SLOT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeSlab(index)}
                      className="flex items-center justify-center rounded-lg border border-border p-2 text-text-tertiary hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                      title="Remove slab"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {slabs.length === 0 && (
                <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-text-tertiary">
                  No pricing slabs defined. Add your first slab to set up tiered
                  pricing.
                </div>
              )}

              {/* Add slab button */}
              <button
                type="button"
                onClick={addSlab}
                className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary hover:border-brand-300 transition-colors w-full justify-center"
              >
                <Plus className="h-4 w-4" />
                Add Slab
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-border px-5 py-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Slabs"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const { can } = useAuth();
  const [accounts, setAccounts] = useState<ApiCorporateAccount[]>([]);
  const [requests, setRequests] = useState<ApiCorporateOnboardingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AccountStatus>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modal, setModal] = useState<ApiCorporateAccount | null | "new">(undefined as any);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [slabTarget, setSlabTarget] = useState<{ id: string; name: string } | null>(null);

  const loadRequests = async () => {
    setRequestsLoading(true);
    try {
      const res = await getCorporateOnboardingRequests({ pageSize: 100 });
      setRequests(res.data);
    } catch {
      setRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      getCorporateAccounts()
        .then((res) => setAccounts(res.data))
        .catch(() => setAccounts([]))
        .finally(() => setIsLoading(false)),
      loadRequests(),
    ]).catch(() => undefined);
  }, []);

  function openEdit(account: ApiCorporateAccount) { setModal(account); setModalOpen(true); }
  function openNew() { setModal(null); setModalOpen(true); }
  function closeModal() { setModalOpen(false); }

  function handleSaved(saved: ApiCorporateAccount) {
    setAccounts((prev) => {
      const exists = prev.find((a) => a.id === saved.id);
      return exists ? prev.map((a) => a.id === saved.id ? saved : a) : [saved, ...prev];
    });
    closeModal();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCorporateAccount(deleteTarget.id);
      setAccounts((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      toast.success(`${deleteTarget.name} deleted`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
    setDeleteTarget(null);
  }

  async function handleReviewRequest(
    request: ApiCorporateOnboardingRequest,
    reviewStatus: ReviewStatus,
  ) {
    const notes =
      reviewStatus === "APPROVED"
        ? ""
        : (window.prompt(
            reviewStatus === "CHANGES_REQUESTED"
              ? "What changes should the client make before approval?"
              : "Why is this onboarding request being rejected?",
          ) ?? "");

    if (reviewStatus !== "APPROVED" && !notes.trim()) {
      toast.error("A short note is required for this action");
      return;
    }

    try {
      const reviewed = await reviewCorporateOnboardingRequest(request.id, {
        reviewStatus,
        notes: notes.trim() || undefined,
        issueAccessToken: reviewStatus === "APPROVED",
        regenerateAccessToken: reviewStatus === "APPROVED" && request.reviewStatus === "APPROVED",
      });

      setRequests((prev) => prev.map((item) => (item.id === reviewed.id ? reviewed : item)));

      if (reviewStatus === "APPROVED" && reviewed.accessToken) {
        const webOrigin =
          typeof window !== "undefined" && window.location.port === "3001"
            ? `${window.location.protocol}//${window.location.hostname}:3000`
            : window.location.origin;
        const accessUrl = `${webOrigin}/en/order?access=${encodeURIComponent(reviewed.accessToken)}`;
        await navigator.clipboard.writeText(accessUrl);
        toast.success("Client approved. Ordering link copied to clipboard.");
      } else {
        toast.success(`Request marked ${REVIEW_STATUS_CONFIG[reviewStatus].label.toLowerCase()}`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to review onboarding request");
    }
  }

  const filtered = accounts.filter((a) => {
    const status = deriveStatus(a);
    const matchSearch =
      !search ||
      a.companyName.toLowerCase().includes(search.toLowerCase()) ||
      (a.contactPerson ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (a.gstin ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeAccounts = accounts.filter((a) => deriveStatus(a) === "active");
  const totalEmployees = activeAccounts.reduce((s, a) => s + a._count.customers, 0);
  const totalOutstanding = accounts.reduce((s, a) => s + (a.outstandingAmount ?? 0), 0);
  const pendingRequests = requests.filter((request) => request.reviewStatus === "PENDING");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Corporate Accounts</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {isLoading
              ? "Loading…"
              : `${activeAccounts.length} active accounts · ${totalEmployees} employees covered`}
          </p>
        </div>
        {can("accounts:create") && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" />
            Add Account
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Pending Requests",   value: requestsLoading ? "…" : pendingRequests.length.toString(),        icon: FileText,     color: "text-warning-600", bg: "bg-warning-50" },
          { label: "Active Accounts",    value: isLoading ? "…" : activeAccounts.length.toString(),               icon: Building2,    color: "text-brand-600",   bg: "bg-brand-50" },
          { label: "Employees Covered",  value: isLoading ? "…" : totalEmployees.toLocaleString("en-IN"),         icon: Users,        color: "text-info-600",    bg: "bg-info-50" },
          { label: "Outstanding",        value: isLoading ? "…" : formatCurrency(totalOutstanding),               icon: IndianRupee,  color: totalOutstanding > 0 ? "text-warning-600" : "text-success-600", bg: totalOutstanding > 0 ? "bg-warning-50" : "bg-success-50" },
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

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Onboarding Requests</h2>
            <p className="text-sm text-text-secondary">
              Review public client onboarding submissions and issue ordering access.
            </p>
          </div>
        </div>

        {requestsLoading ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-sm text-text-tertiary">
            Loading onboarding requests…
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-text-tertiary">
            No onboarding requests yet.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {requests.map((request) => {
              const status = REVIEW_STATUS_CONFIG[request.reviewStatus];
              return (
                <div key={request.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-base font-semibold text-text-primary">{request.companyName}</p>
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", status.bg, status.text)}>
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">{request.contactName}</p>
                    </div>
                    <p className="text-xs text-text-tertiary">{fmt(request.createdAt)}</p>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-text-secondary">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-text-tertiary" />
                      <span>{request.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PhoneCall className="h-4 w-4 text-text-tertiary" />
                      <span>{request.phone}</span>
                    </div>
                    {request.city ? (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-text-tertiary" />
                        <span>{request.city}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
                    <div className="rounded-lg bg-surface-secondary px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wider text-text-tertiary">Meals / day</div>
                      <div className="mt-1 font-semibold text-text-primary">{request.estimatedDailyMeals ?? "Not shared"}</div>
                    </div>
                    <div className="rounded-lg bg-surface-secondary px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wider text-text-tertiary">Go live</div>
                      <div className="mt-1 font-semibold text-text-primary">{request.goLiveDate ? fmt(request.goLiveDate) : "Flexible"}</div>
                    </div>
                  </div>

                  {request.notes ? (
                    <div className="mt-4 rounded-lg border border-border bg-surface-secondary px-3 py-3 text-sm text-text-secondary">
                      {request.notes}
                    </div>
                  ) : null}

                  {request.reviewNotes ? (
                    <div className="mt-3 rounded-lg border border-border bg-white px-3 py-3 text-sm">
                      <div className="text-[11px] uppercase tracking-wider text-text-tertiary">Last review note</div>
                      <div className="mt-1 text-text-secondary">{request.reviewNotes}</div>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleReviewRequest(request, "APPROVED")}
                      className="rounded-lg bg-success-600 px-3 py-2 text-xs font-semibold text-white hover:bg-success-700"
                    >
                      {request.reviewStatus === "APPROVED" ? "Reissue Link" : "Approve & Issue Link"}
                    </button>
                    <button
                      onClick={() => handleReviewRequest(request, "CHANGES_REQUESTED")}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      Request Changes
                    </button>
                    <button
                      onClick={() => handleReviewRequest(request, "REJECTED")}
                      className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-700 hover:bg-danger-100"
                    >
                      Reject
                    </button>
                    {request.accessTokenExpiresAt ? (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-text-tertiary">
                        <LinkIcon className="h-3.5 w-3.5" />
                        Expires {fmt(request.accessTokenExpiresAt)}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company, contact, or GSTIN…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-4 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-lg border border-border bg-surface py-2 pl-3 pr-8 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-text-tertiary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading from API…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-20 text-center text-sm text-text-tertiary">
          {accounts.length === 0
            ? "No corporate accounts found. Add your first corporate client to get started."
            : "No accounts match your search."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((account) => {
            const status = deriveStatus(account);
            const cfg = STATUS_CONFIG[status];
            const StatusIcon = cfg.icon;
            const isExpanded = expandedId === account.id;
            const daysToExpiry = Math.ceil(
              (new Date(account.contractEnd).getTime() - Date.now()) / 86400000,
            );
            const expiryWarning = daysToExpiry > 0 && daysToExpiry <= 60;

            return (
              <div
                key={account.id}
                className={cn(
                  "overflow-hidden rounded-xl border bg-surface transition-all",
                  status === "expired" ? "border-danger-200"
                    : expiryWarning ? "border-warning-200"
                    : "border-border",
                )}
              >
                {/* Account header row */}
                <div className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                    <Building2 className="h-5 w-5 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-text-primary">{account.companyName}</p>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", cfg.bg, cfg.text)}>
                        <StatusIcon className="inline h-3 w-3 mr-0.5" />
                        {cfg.label}
                      </span>
                      {expiryWarning && status === "active" && (
                        <span className="rounded-full bg-warning-50 px-2 py-0.5 text-[11px] font-semibold text-warning-700">
                          Expires in {daysToExpiry}d
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-text-secondary">
                      {account.contactPerson && (
                        <span>{account.contactPerson}{account.contactPhone ? ` · ${account.contactPhone}` : ""}</span>
                      )}
                      {account.gstin && <span>GSTIN: {account.gstin}</span>}
                      <span>NET {account.paymentTermsDays} days</span>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-6 text-right">
                    <div>
                      <p className="text-sm font-bold text-text-primary">{account._count.customers}</p>
                      <p className="text-[11px] text-text-tertiary">Employees</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary">{formatCurrency(account.subsidyPerMeal)}/meal</p>
                      <p className="text-[11px] text-text-tertiary">Subsidy</p>
                    </div>
                    {account.outstandingAmount > 0 ? (
                      <div>
                        <p className="text-sm font-bold text-danger-600">{formatCurrency(account.outstandingAmount)}</p>
                        <p className="text-[11px] text-text-tertiary">Outstanding</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-bold text-success-600">Paid up</p>
                        <p className="text-[11px] text-text-tertiary">Outstanding</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {can("accounts:edit") && (
                      <button
                        onClick={() => openEdit(account)}
                        className="rounded-lg border border-border p-2 text-text-secondary hover:bg-surface-secondary hover:text-brand-600 transition-colors"
                        title="Edit account"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    {can("accounts:edit") && (
                      <button
                        onClick={() => setDeleteTarget({ id: account.id, name: account.companyName })}
                        className="rounded-lg border border-border p-2 text-text-secondary hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                        title="Delete account"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : account.id)}
                      className="rounded-lg border border-border p-2 text-text-secondary hover:bg-surface-secondary"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border bg-surface-secondary px-4 py-4">
                    <div className="rounded-lg border border-border bg-surface p-4">
                      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                        Contract & Billing Config
                      </h4>
                      <div className="grid gap-2 sm:grid-cols-2 text-sm">
                        {[
                          ["Subsidy Per Meal", account.subsidyPerMeal > 0 ? formatCurrency(account.subsidyPerMeal) : "None"],
                          ["Max Meals / Day", `${account.maxMealsPerDay} per employee`],
                          ["Max Meals / Month", account.maxMealsPerMonth != null ? `${account.maxMealsPerMonth}` : "—"],
                          ["Rate / Breakfast", account.ratePerBreakfast ? formatCurrency(account.ratePerBreakfast) : "—"],
                          ["Rate / Lunch", account.ratePerLunch ? formatCurrency(account.ratePerLunch) : "—"],
                          ["Rate / Snacks", account.ratePerSnacks ? formatCurrency(account.ratePerSnacks) : "—"],
                          ["Rate / Dinner", account.ratePerDinner ? formatCurrency(account.ratePerDinner) : "—"],
                          ["Monthly Budget Cap", account.monthlyBudgetCap != null ? formatCurrency(account.monthlyBudgetCap) : "—"],
                          ["Payment Terms", `NET ${account.paymentTermsDays} days`],
                          ["Contract Start", fmt(account.contractStart)],
                          ["Contract End", fmt(account.contractEnd)],
                          ["Billing City", account.billingCity],
                          ["Billing Pincode", account.billingPincode],
                          ["Billing Email", account.billingEmail],
                          ["State Code", account.stateCode],
                        ].map(([label, value]) => (
                          <div key={label} className="flex justify-between gap-4">
                            <span className="text-text-tertiary">{label}</span>
                            <span className="font-medium text-text-primary text-right">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a href={`/invoicing?account=${account.id}&action=create`}
                        className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600">
                        Generate Invoice
                      </a>
                      <a href={`/invoicing?account=${account.id}`}
                        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-secondary">
                        View Invoices
                      </a>
                      <button
                        onClick={() => setSlabTarget({ id: account.id, name: account.companyName })}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-secondary"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        Pricing Slabs
                      </button>
                      {account.outstandingAmount > 0 && (
                        <a
                          href={`mailto:${encodeURIComponent(account.billingEmail)}?subject=${encodeURIComponent(`Payment reminder: ${account.companyName}`)}&body=${encodeURIComponent(`Hello,\n\nThis is a reminder that ${account.companyName} has an outstanding balance of ${formatCurrency(account.outstandingAmount)}.\n\nPlease let us know your payment timeline.\n`)}`}
                          className="rounded-lg border border-warning-300 bg-warning-50 px-3 py-1.5 text-xs font-semibold text-warning-700 hover:bg-warning-100"
                        >
                          Send Payment Reminder
                        </a>
                      )}
                      {status === "expired" && (
                        <button onClick={() => openEdit(account)}
                          className="rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100">
                          Renew Contract
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <AccountModal
          account={modal as ApiCorporateAccount | null}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        name={deleteTarget?.name ?? ""}
        type="Corporate Account"
      />

      {/* Slab Pricing Editor */}
      {slabTarget && (
        <SlabPricingEditor
          accountId={slabTarget.id}
          accountName={slabTarget.name}
          onClose={() => setSlabTarget(null)}
        />
      )}
    </div>
  );
}
