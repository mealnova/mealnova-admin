"use client";
import { useState } from "react";
import { Plus, Edit, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  usePricingTiers,
  useCreatePricingTier,
  useUpdatePricingTier,
  useDeletePricingTier,
  type PricingTier,
} from "@/lib/queries/content";

// ── Category badge helper ─────────────────────────────────────────────────────

function CategoryBadge({ category }: { category?: string | null }) {
  const map: Record<string, string> = {
    daily: "bg-brand-50 text-brand-700",
    event: "bg-purple-50 text-purple-700",
    hostel: "bg-amber-50 text-amber-700",
    wedding: "bg-pink-50 text-pink-700",
  };
  const cls = map[category ?? ""] ?? "bg-surface-secondary text-text-tertiary";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${cls}`}>
      {category ?? "—"}
    </span>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function PricingTierModal({
  item,
  onClose,
}: {
  item: PricingTier | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: item?.name ?? "",
    description: item?.description ?? "",
    price: item?.price ?? "",
    featuresText: item?.features?.join("\n") ?? "",
    category: item?.category ?? "daily",
    sortOrder: item?.sortOrder ?? 0,
    isPopular: item?.isPopular ?? false,
    isActive: item?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const create = useCreatePricingTier();
  const update = useUpdatePricingTier();

  function set(field: string, value: string | boolean | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Plan name is required"); return; }
    if (!form.price.trim() || Number(form.price) <= 0) { toast.error("Price must be greater than 0"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: form.price.trim(),
        features: form.featuresText.split("\n").map((f) => f.trim()).filter(Boolean),
        category: form.category,
        sortOrder: form.sortOrder,
        isPopular: form.isPopular,
        isActive: form.isActive,
      };
      if (item) {
        await update.mutateAsync({ id: item.id, data: { ...payload } });
        toast.success("Updated successfully");
      } else {
        await create.mutateAsync({ ...payload } as any);
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
            {item ? "Edit" : "Add"} Pricing Tier
          </h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Plan Name *</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Standard Corporate"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Short description of this pricing tier…"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Price per Plate (₹) *</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="120"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Features (one per line)</label>
            <textarea
              rows={4}
              value={form.featuresText}
              onChange={(e) => set("featuresText", e.target.value)}
              placeholder={"2 meals per day\nCustom menu rotation\nDedicated account manager"}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            >
              <option value="daily">Daily</option>
              <option value="event">Event</option>
              <option value="hostel">Hostel</option>
              <option value="wedding">Wedding</option>
            </select>
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
                checked={form.isPopular}
                onChange={(e) => set("isPopular", e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Popular
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

export default function PricingPage() {
  const { data: items = [], isLoading } = usePricingTiers();
  const del = useDeletePricingTier();
  const [editing, setEditing] = useState<PricingTier | "new" | null>(null);

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
          <h1 className="text-xl font-semibold text-text-primary">Pricing Tiers</h1>
          <p className="text-sm text-text-secondary mt-0.5">Manage pricing plans shown on the website</p>
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Popular</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Active</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-secondary/50">
                  <td className="px-4 py-3 text-text-primary font-medium">{item.name}</td>
                  <td className="px-4 py-3">
                    <CategoryBadge category={item.category} />
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {item.price != null ? `₹${Number(item.price)}/plate` : <span className="text-text-tertiary">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {item.isPopular ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Popular</span>
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
        <PricingTierModal
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
