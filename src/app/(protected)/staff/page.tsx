"use client";

import { useState, useEffect } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import {
  getEmployees,
  getLocations,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  type ApiEmployee,
  type ApiLocation,
} from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import {
  Plus, Search, UserCheck, Users, IndianRupee, Loader2, Briefcase, Edit, X, Trash2,
} from "lucide-react";

// ── Role display config ───────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  HEAD_CHEF:  { label: "Head Chef",  color: "text-brand-700",       bg: "bg-brand-50" },
  SOUS_CHEF:  { label: "Sous Chef",  color: "text-purple-700",      bg: "bg-purple-50" },
  COOK:       { label: "Cook",       color: "text-amber-700",       bg: "bg-amber-50" },
  HELPER:     { label: "Helper",     color: "text-info-700",        bg: "bg-info-50" },
  DRIVER:     { label: "Driver",     color: "text-success-700",     bg: "bg-success-50" },
  CLEANER:    { label: "Cleaner",    color: "text-text-secondary",  bg: "bg-surface-tertiary" },
  SUPERVISOR: { label: "Supervisor", color: "text-danger-700",      bg: "bg-danger-50" },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] ?? { label: role, color: "text-text-secondary", bg: "bg-surface-tertiary" };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", cfg.bg, cfg.color)}>
      {cfg.label}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Staff Modal ───────────────────────────────────────────────────────────────

function StaffModal({
  employee,
  locations,
  onClose,
  onSaved,
}: {
  employee: ApiEmployee | null;
  locations: ApiLocation[];
  onClose: () => void;
  onSaved: (e: ApiEmployee) => void;
}) {
  const isEdit = !!employee;
  const [form, setForm] = useState({
    name: employee?.name ?? "",
    phone: employee?.phone ?? "",
    email: employee?.email ?? "",
    role: employee?.role ?? "COOK",
    locationId: employee?.locationId ?? "",
    salary: String(employee?.salary ?? ""),
    pfNumber: employee?.pfNumber ?? "",
    esiNumber: employee?.esiNumber ?? "",
    dateOfJoining: employee?.dateOfJoining ? employee.dateOfJoining.split("T")[0] : "",
  });
  const [saving, setSaving] = useState(false);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.role) {
      toast.error("Name, phone, and role are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        role: form.role,
        locationId: form.locationId || undefined,
        salary: parseFloat(form.salary) || 0,
        pfNumber: form.pfNumber.trim() || undefined,
        esiNumber: form.esiNumber.trim() || undefined,
        dateOfJoining: form.dateOfJoining || new Date().toISOString().split("T")[0],
      };
      const saved = isEdit
        ? await updateEmployee(employee!.id, payload)
        : await createEmployee(payload);
      toast.success(isEdit ? "Staff record updated" : `${saved.name} added`);
      onSaved(saved);
    } catch (err: any) {
      toast.error(err.message || "Failed to save staff record");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <h2 className="text-base font-semibold text-text-primary">
            {isEdit ? `Edit — ${employee!.name}` : "Add Staff Member"}
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
                placeholder="Ramesh Patil"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Phone *</label>
              <input required value={form.phone} onChange={(e) => set("phone", e.target.value)}
                placeholder="+91 98..."
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                placeholder="ramesh@..."
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Role *</label>
              <select required value={form.role} onChange={(e) => set("role", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none">
                {Object.entries(ROLE_CONFIG).map(([v, { label }]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
                <option value="MANAGER">Manager</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Location</label>
              <select value={form.locationId} onChange={(e) => set("locationId", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none">
                <option value="">All / No specific location</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Monthly Salary (₹)</label>
              <input type="number" min="0" step="100" value={form.salary} onChange={(e) => set("salary", e.target.value)}
                placeholder="15000"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Date of Joining</label>
              <input type="date" value={form.dateOfJoining} onChange={(e) => set("dateOfJoining", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">PF Number</label>
              <input value={form.pfNumber} onChange={(e) => set("pfNumber", e.target.value)}
                placeholder="MH/PUN/..."
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">ESI Number</label>
              <input value={form.esiNumber} onChange={(e) => set("esiNumber", e.target.value)}
                placeholder="ESI number (if applicable)"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Staff"}
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

export default function StaffPage() {
  const { can } = useAuth();
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [modal, setModal] = useState<{ open: boolean; employee: ApiEmployee | null }>({ open: false, employee: null });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    Promise.all([getEmployees(), getLocations()])
      .then(([eRes, locs]) => { setEmployees(eRes.data); setLocations(locs); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  function openNew() { setModal({ open: true, employee: null }); }
  function openEdit(employee: ApiEmployee) { setModal({ open: true, employee }); }
  function closeModal() { setModal({ open: false, employee: null }); }

  function handleSaved(saved: ApiEmployee) {
    setEmployees((prev) => {
      const exists = prev.find((e) => e.id === saved.id);
      return exists ? prev.map((e) => e.id === saved.id ? saved : e) : [saved, ...prev];
    });
    closeModal();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteEmployee(deleteTarget.id);
      setEmployees((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      toast.success(`${deleteTarget.name} deleted`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
    setDeleteTarget(null);
  }

  const filtered = employees.filter((e) => {
    const matchSearch =
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || e.role === roleFilter;
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && e.isActive) ||
      (statusFilter === "inactive" && !e.isActive);
    return matchSearch && matchRole && matchStatus;
  });

  const active = employees.filter((e) => e.isActive).length;
  const totalPayroll = employees.filter((e) => e.isActive).reduce((s, e) => s + e.salary, 0);
  const roles = Array.from(new Set(employees.map((e) => e.role))).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Staff</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {isLoading ? "Loading…" : `${active} active employees · ₹${totalPayroll.toLocaleString("en-IN")} monthly payroll`}
          </p>
        </div>
        {can("staff:create") && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" />
            Add Staff
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Staff",     value: isLoading ? "…" : employees.length.toString(), icon: Users,       color: "text-brand-600",   bg: "bg-brand-50" },
          { label: "Active",          value: isLoading ? "…" : active.toString(),           icon: UserCheck,   color: "text-success-600", bg: "bg-success-50" },
          { label: "Monthly Payroll", value: isLoading ? "…" : formatCurrency(totalPayroll), icon: IndianRupee, color: "text-warning-600", bg: "bg-warning-50" },
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
            placeholder="Search by name, ID, or role…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-4 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
          />
        </div>
        {roles.length > 0 && (
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface py-2 pl-3 pr-8 text-sm text-text-primary focus:border-brand-500 focus:outline-none">
            <option value="all">All Roles</option>
            {roles.map((r) => <option key={r} value={r}>{ROLE_CONFIG[r]?.label ?? r}</option>)}
          </select>
        )}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-lg border border-border bg-surface py-2 pl-3 pr-8 text-sm text-text-primary focus:border-brand-500 focus:outline-none">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-text-tertiary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading staff…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-20 text-center">
          <Briefcase className="mx-auto mb-3 h-10 w-10 text-text-tertiary" />
          <p className="text-sm font-medium text-text-secondary">
            {employees.length === 0
              ? "No staff records yet. Add your first employee to get started."
              : "No staff match your filters."}
          </p>
          {employees.length === 0 && can("staff:create") && (
            <button onClick={openNew}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              <Plus className="h-4 w-4" /> Add First Staff Member
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Employee</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary sm:table-cell">Role</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary md:table-cell">Contact</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary lg:table-cell">Joined</th>
                <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-tertiary lg:table-cell">Salary</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Status</th>
                {can("staff:edit") && (
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-surface-secondary transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                        {e.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{e.name}</p>
                        <p className="text-xs text-text-tertiary">{e.employeeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <RoleBadge role={e.role} />
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell text-text-secondary">
                    <div>{e.phone}</div>
                    {e.email && <div className="text-xs text-text-tertiary">{e.email}</div>}
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell text-text-secondary">
                    {fmtDate(e.dateOfJoining)}
                  </td>
                  <td className="hidden px-4 py-3 text-right lg:table-cell text-text-primary font-medium">
                    {formatCurrency(e.salary)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      e.isActive ? "bg-success-50 text-success-700" : "bg-surface-tertiary text-text-tertiary",
                    )}>
                      {e.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {can("staff:edit") && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(e)}
                          className="rounded-lg border border-border p-1.5 text-text-secondary hover:bg-surface-secondary hover:text-brand-600 transition-colors"
                          title="Edit">
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget({ id: e.id, name: e.name })}
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
            {filtered.length} of {employees.length} employees
          </div>
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <StaffModal
          employee={modal.employee}
          locations={locations}
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
        type="Staff Member"
      />
    </div>
  );
}
