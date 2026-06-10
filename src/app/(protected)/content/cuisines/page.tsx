"use client";
import { useState } from "react";
import { Plus, Edit, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  useCuisines,
  useCreateCuisine,
  useUpdateCuisine,
  useDeleteCuisine,
  type CuisineOption,
} from "@/lib/queries/content";

// ── Modal ─────────────────────────────────────────────────────────────────────

function CuisineModal({
  item,
  onClose,
}: {
  item: CuisineOption | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: item?.name ?? "",
    description: item?.description ?? "",
    imageUrl: item?.imageUrl ?? "",
    pricePerPlate: item?.pricePerPlate ?? 0,
    sortOrder: item?.sortOrder ?? 0,
    isLiveCounter: item?.isLiveCounter ?? false,
    isActive: item?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const create = useCreateCuisine();
  const update = useUpdateCuisine();

  function set(field: string, value: string | boolean | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      if (item) {
        await update.mutateAsync({ id: item.id, data: { ...form } });
        toast.success("Updated successfully");
      } else {
        await create.mutateAsync({ ...form } as any);
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
            {item ? "Edit" : "Add"} Cuisine
          </h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Name *</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Rajasthani Thali"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Short description of this cuisine…"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Image URL</label>
            <input
              value={form.imageUrl}
              onChange={(e) => set("imageUrl", e.target.value)}
              placeholder="https://example.com/cuisine.jpg"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Price per Plate (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.pricePerPlate}
              onChange={(e) => set("pricePerPlate", parseFloat(e.target.value) || 0)}
              placeholder="250"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Sort Order</label>
            <input
              type="number"
              min="0"
              value={form.sortOrder}
              onChange={(e) => set("sortOrder", parseInt(e.target.value) || 0)}
              placeholder="0"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-4 rounded-lg border border-border bg-surface-secondary p-3">
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={form.isLiveCounter}
                onChange={(e) => set("isLiveCounter", e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Live Counter
            </label>
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

export default function CuisinesPage() {
  const { data: items = [], isLoading } = useCuisines();
  const del = useDeleteCuisine();
  const [editing, setEditing] = useState<CuisineOption | "new" | null>(null);

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
          <h1 className="text-xl font-semibold text-text-primary">Cuisines</h1>
          <p className="text-sm text-text-secondary mt-0.5">Manage cuisine options for event packages</p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" /> Add
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
          <p className="text-sm">No items yet. Click "Add" to create one.</p>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Price/plate</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Live Counter</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Active</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-secondary/50">
                  <td className="px-4 py-3 text-text-primary font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {item.pricePerPlate != null
                      ? `₹${item.pricePerPlate}`
                      : <span className="text-text-tertiary">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {item.isLiveCounter ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Live Counter</span>
                    ) : (
                      <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] font-medium text-text-tertiary">No</span>
                    )}
                  </td>
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
        <CuisineModal
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
