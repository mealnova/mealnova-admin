"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  getCustomers,
  getCorporateAccounts,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  type ApiCustomer,
  type ApiCorporateAccount,
} from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import {
  Search, Plus, Users, Building2, Leaf, Loader2, UserCheck, CreditCard, Edit, X, Trash2,
} from "lucide-react";

// ── Dietary badge ────────────────────────────────────────────────────────────

const DIETARY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  JAIN:          { label: "Jain",          color: "text-amber-700",   bg: "bg-amber-50" },
  VEGAN:         { label: "Vegan",         color: "text-success-700", bg: "bg-success-50" },
  SWAMINARAYAN:  { label: "Swaminarayan", color: "text-purple-700",  bg: "bg-purple-50" },
  VEG:           { label: "Veg",           color: "text-brand-700",   bg: "bg-brand-50" },
};

function DietaryBadge({ pref }: { pref: string }) {
  const cfg = DIETARY_CONFIG[pref] ?? DIETARY_CONFIG.VEG;
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", cfg.bg, cfg.color)}>
      {cfg.label}
    </span>
  );
}

// ── Customer Modal ─────────────────────────────────────────────────────────

const ALLERGEN_OPTIONS = ["Gluten","Crustacean","Milk","Egg","Fish","Peanuts","Tree Nuts","Soybeans","Sulphites"];

function CustomerModal({
  customer,
  accounts,
  onClose,
  onSaved,
}: {
  customer: ApiCustomer | null;
  accounts: ApiCorporateAccount[];
  onClose: () => void;
  onSaved: (c: ApiCustomer) => void;
}) {
  const isEdit = !!customer;
  const [form, setForm] = useState({
    name: customer?.name ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    corporateAccountId: customer?.corporateAccountId ?? "",
    dietaryPreference: customer?.dietaryPreference ?? "VEG",
    spicePreference: String(customer?.spicePreference ?? 2),
    mealCardId: customer?.mealCardId ?? "",
    allergens: customer?.allergens ?? [] as string[],
  });
  const [saving, setSaving] = useState(false);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleAllergen(allergen: string) {
    setForm((prev) => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter((a) => a !== allergen)
        : [...prev.allergens, allergen],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        corporateAccountId: form.corporateAccountId || undefined,
        dietaryPreference: form.dietaryPreference,
        spicePreference: parseInt(form.spicePreference) || 2,
        mealCardId: form.mealCardId.trim() || undefined,
        allergens: form.allergens,
      };
      const saved = isEdit
        ? await updateCustomer(customer!.id, payload)
        : await createCustomer(payload);
      toast.success(isEdit ? "Customer updated" : `${saved.name} added`);
      onSaved(saved);
    } catch (err: any) {
      toast.error(err.message || "Failed to save customer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <h2 className="text-base font-semibold text-text-primary">
            {isEdit ? `Edit — ${customer!.name}` : "Add Customer"}
          </h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1">Full Name *</label>
              <input required value={form.name} onChange={(e) => set("name", e.target.value)}
                placeholder="Rahul Sharma"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Phone *</label>
              <input required value={form.phone} onChange={(e) => set("phone", e.target.value)}
                placeholder="Enter phone number"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                placeholder="rahul@company.com"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1">Corporate Account</label>
              <select value={form.corporateAccountId} onChange={(e) => set("corporateAccountId", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none">
                <option value="">No corporate account (walk-in)</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.companyName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Dietary Preference</label>
              <select value={form.dietaryPreference} onChange={(e) => set("dietaryPreference", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none">
                <option value="VEG">Veg</option>
                <option value="JAIN">Jain</option>
                <option value="VEGAN">Vegan</option>
                <option value="SWAMINARAYAN">Swaminarayan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Spice Level (1-5)</label>
              <select value={form.spicePreference} onChange={(e) => set("spicePreference", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none">
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {["Very Mild","Mild","Medium","Spicy","Very Spicy"][n-1]}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1">Meal Card ID</label>
              <input value={form.mealCardId} onChange={(e) => set("mealCardId", e.target.value)}
                placeholder="RFID / card number (optional)"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-2">Allergens</label>
              <div className="flex flex-wrap gap-1.5">
                {ALLERGEN_OPTIONS.map((a) => (
                  <button type="button" key={a}
                    onClick={() => toggleAllergen(a)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                      form.allergens.includes(a)
                        ? "border-danger-300 bg-danger-50 text-danger-700"
                        : "border-border bg-surface text-text-secondary hover:border-border-strong"
                    )}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Confirm Delete Dialog ──────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const { can } = useAuth();
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [accounts, setAccounts] = useState<ApiCorporateAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [modal, setModal] = useState<{ open: boolean; customer: ApiCustomer | null }>({ open: false, customer: null });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    Promise.all([getCustomers(), getCorporateAccounts()])
      .then(([cRes, aRes]) => { setCustomers(cRes.data); setAccounts(aRes.data); })
      .catch(() => { setCustomers([]); setAccounts([]); })
      .finally(() => setIsLoading(false));
  }, []);

  function openNew() { setModal({ open: true, customer: null }); }
  function openEdit(customer: ApiCustomer) { setModal({ open: true, customer }); }
  function closeModal() { setModal({ open: false, customer: null }); }

  function handleSaved(saved: ApiCustomer) {
    setCustomers((prev) => {
      const exists = prev.find((c) => c.id === saved.id);
      return exists ? prev.map((c) => c.id === saved.id ? saved : c) : [saved, ...prev];
    });
    closeModal();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCustomer(deleteTarget.id);
      setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      toast.success(`${deleteTarget.name} deleted`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
    setDeleteTarget(null);
  }

  const filtered = customers.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.corporateAccount?.companyName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchAccount = accountFilter === "all" || c.corporateAccountId === accountFilter;
    return matchSearch && matchAccount;
  });

  const active = customers.filter((c) => c.isActive).length;
  const withCards = customers.filter((c) => !!c.mealCardId).length;
  const corporate = customers.filter((c) => !!c.corporateAccountId).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Customers</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {isLoading ? "Loading…" : `${active} active · ${corporate} linked to accounts`}
          </p>
        </div>
        {can("customers:create") && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Customers",    value: isLoading ? "…" : customers.length.toString(), icon: Users,     color: "text-brand-600",   bg: "bg-brand-50" },
          { label: "Active",             value: isLoading ? "…" : active.toString(),           icon: UserCheck, color: "text-success-600", bg: "bg-success-50" },
          { label: "Meal Cards Issued",  value: isLoading ? "…" : withCards.toString(),        icon: CreditCard, color: "text-info-600",   bg: "bg-info-50" },
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

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email, or company…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-4 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
          />
        </div>
        <select
          value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface py-2 pl-3 pr-8 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
        >
          <option value="all">All Accounts</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.companyName}</option>)}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-text-tertiary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading customers…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-20 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-text-tertiary" />
          <p className="text-sm font-medium text-text-secondary">
            {customers.length === 0
              ? "No customers yet. Add customers and link them to corporate accounts."
              : "No customers match your search."}
          </p>
          {customers.length === 0 && can("customers:create") && (
            <button onClick={openNew}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              <Plus className="h-4 w-4" /> Add First Customer
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Customer</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary sm:table-cell">Contact</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary md:table-cell">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Diet</th>
                <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-tertiary lg:table-cell">Orders</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Status</th>
                {can("customers:edit") && (
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-surface-secondary transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-text-primary">{c.name}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell text-text-secondary">
                    <div>{c.phone}</div>
                    {c.email && <div className="text-xs text-text-tertiary">{c.email}</div>}
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {c.corporateAccount ? (
                      <div className="flex items-center gap-1.5 text-text-secondary">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                        {c.corporateAccount.companyName}
                      </div>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <DietaryBadge pref={c.dietaryPreference} />
                    {c.allergens.length > 0 && (
                      <span title={c.allergens.join(", ")}>
                        <Leaf className="ml-1 inline h-3 w-3 text-warning-500" />
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-text-secondary lg:table-cell">
                    {c._count.orders}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      c.isActive ? "bg-success-50 text-success-700" : "bg-surface-tertiary text-text-tertiary",
                    )}>
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                    {c.mealCardId && (
                      <span title="Meal card issued">
                        <CreditCard className="ml-1.5 inline h-3.5 w-3.5 text-info-500" />
                      </span>
                    )}
                  </td>
                  {can("customers:edit") && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(c)}
                          className="rounded-lg border border-border p-1.5 text-text-secondary hover:bg-surface-secondary hover:text-brand-600 transition-colors"
                          title="Edit">
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                          className="rounded-lg border border-border p-1.5 text-text-secondary hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                          title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-border px-4 py-2.5 text-xs text-text-tertiary">
            {filtered.length} of {customers.length} customers
          </div>
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <CustomerModal
          customer={modal.customer}
          accounts={accounts}
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
        type="Customer"
      />
    </div>
  );
}
