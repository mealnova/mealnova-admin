"use client";

import { useState } from "react";
import { Plus, Edit, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  useCareers,
  useCreateCareer,
  useUpdateCareer,
  useDeleteCareer,
  type Career,
} from "@/lib/queries/content";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
};

// ── Modal ─────────────────────────────────────────────────────────────────────

function CareerModal({
  item,
  onClose,
}: {
  item: Career | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    title: item?.title ?? "",
    department: item?.department ?? "Kitchen",
    employmentType: item?.employmentType ?? "FULL_TIME",
    location: item?.location ?? "Pune, Maharashtra",
    description: item?.description ?? "",
    requirementsText: item?.requirements?.join("\n") ?? "",
    isActive: item?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const create = useCreateCareer();
  const update = useUpdateCareer();

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Job title is required"); return; }
    if (!form.description.trim()) { toast.error("Job description is required"); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        department: form.department,
        employmentType: form.employmentType,
        location: form.location.trim(),
        description: form.description.trim(),
        requirements: form.requirementsText
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean),
        isActive: form.isActive,
      };
      if (item) {
        await update.mutateAsync({ id: item.id, data: payload });
        toast.success("Updated successfully");
      } else {
        await create.mutateAsync(payload as any);
        toast.success("Created successfully");
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-surface shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <h2 className="text-base font-semibold text-text-primary">
            {item ? "Edit" : "Add"} Job Opening
          </h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Job Title *</label>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Head Chef"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Department</label>
            <select
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            >
              <option value="Kitchen">Kitchen</option>
              <option value="Operations">Operations</option>
              <option value="Sales">Sales</option>
              <option value="Finance">Finance</option>
              <option value="HR">HR</option>
              <option value="Delivery">Delivery</option>
              <option value="Technology">Technology</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Employment Type</label>
            <select
              value={form.employmentType}
              onChange={(e) => set("employmentType", e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            >
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERNSHIP">Internship</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Location</label>
            <input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Pune, Maharashtra"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Job Description *</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe the role, responsibilities…"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Requirements</label>
            <textarea
              rows={3}
              value={form.requirementsText}
              onChange={(e) => set("requirementsText", e.target.value)}
              placeholder="List skills, qualifications, experience required…"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none resize-none"
            />
          </div>
          <div className="flex items-center gap-4 rounded-lg border border-border bg-surface-secondary p-3">
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Active
            </label>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {saving ? "Saving…" : item ? "Save Changes" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CareersPage() {
  const { data: items = [], isLoading } = useCareers();
  const del = useDeleteCareer();
  const [editing, setEditing] = useState<Career | "new" | null>(null);

  async function handleDelete(id: string | number) {
    if (!window.confirm("Delete this item? This cannot be undone.")) return;
    try {
      await del.mutateAsync(id);
      toast.success("Deleted");
    } catch (err: any) {
      toast.error(err.message ?? "Delete failed");
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Careers</h1>
          <p className="text-sm text-text-secondary mt-0.5">Manage job openings and listings</p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" /> Add Item
        </button>
      </div>

      {isLoading && (
        <div className="mt-4 space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-surface-secondary animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="mt-8 text-center py-12 text-text-tertiary">
          <p className="text-sm">No items yet. Click "Add Item" to create one.</p>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-secondary/50">
                  <td className="px-4 py-3 text-text-primary font-medium">{item.title}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                      {item.department ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {item.employmentType ? (TYPE_LABELS[item.employmentType] ?? item.employmentType) : "—"}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{item.location ?? "—"}</td>
                  <td className="px-4 py-3">
                    {item.isActive ? (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">Active</span>
                    ) : (
                      <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] font-medium text-text-tertiary">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditing(item)}
                        className="text-text-tertiary hover:text-text-primary"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-text-tertiary hover:text-danger-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && (
        <CareerModal
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
