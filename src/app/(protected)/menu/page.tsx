"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Search, Plus, Leaf, Loader2, Lock, Building2, UtensilsCrossed, Edit, X,
  Trash2, Settings2, GripVertical, IndianRupee,
} from "lucide-react";
import {
  getLocations, getMenuItems, deleteMenuItem,
  createMenuItem, updateMenuItem, toggleMenuItemAvailability,
  getMenuCategories, createMenuCategory, updateMenuCategory, deleteMenuCategory,
  getMenuItemSlabs, saveMenuItemSlabs,
  type ApiLocation, type ApiMenuItem, type ApiMenuCategory,
} from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

// ── Dietary badge ─────────────────────────────────────────────────────────────

function DietBadge({ isJain, isVegan }: { isJain: boolean; isVegan: boolean }) {
  if (isJain)
    return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Jain</span>;
  if (isVegan)
    return <span className="rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-semibold text-success-700">Vegan</span>;
  return <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">Veg</span>;
}

// ── Location tab ──────────────────────────────────────────────────────────────

function LocationTab({ loc, active, onClick }: { loc: ApiLocation; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-brand-500 text-white" : "text-text-secondary hover:bg-surface-secondary"
      )}
    >
      {loc.isRestricted ? <Lock className="h-3.5 w-3.5 shrink-0" /> : <Building2 className="h-3.5 w-3.5 shrink-0" />}
      <span className="truncate max-w-[140px]">{loc.name}</span>
    </button>
  );
}

// ── Menu Item Modal ───────────────────────────────────────────────────────────

function MenuItemModal({
  item,
  categories,
  locationId,
  onClose,
  onSaved,
}: {
  item: ApiMenuItem | null; // null = create
  categories: ApiMenuCategory[];
  locationId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    name: item?.name ?? "",
    nameHi: item?.nameHi ?? "",
    description: item?.description ?? "",
    categoryId: item?.category?.id ?? "",
    basePrice: String(item?.basePrice ?? ""),
    isJain: item?.isJain ?? false,
    isVegan: item?.isVegan ?? false,
    isAvailable: item?.isAvailable ?? true,
    sortOrder: String(item?.sortOrder ?? "0"),
  });
  const [saving, setSaving] = useState(false);

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Item name is required"); return; }
    if (!form.categoryId) { toast.error("Category is required"); return; }
    if (!form.basePrice || parseFloat(form.basePrice) <= 0) { toast.error("Price must be greater than 0"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        nameHi: form.nameHi.trim() || undefined,
        description: form.description.trim() || undefined,
        categoryId: form.categoryId,
        basePrice: parseFloat(form.basePrice),
        locationId: locationId || undefined,
        isJain: form.isJain,
        isVegan: form.isVegan,
        isAvailable: form.isAvailable,
        sortOrder: parseInt(form.sortOrder) || 0,
      };
      if (isEdit) {
        await updateMenuItem(item!.id, payload);
      } else {
        await createMenuItem(payload);
      }
      toast.success(isEdit ? "Item updated" : "Item added");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to save item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <h2 className="text-base font-semibold text-text-primary">
            {isEdit ? `Edit — ${item!.name}` : "Add Menu Item"}
          </h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1">Item Name (English) *</label>
              <input required value={form.name} onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Paneer Tikka Masala"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1">Item Name (Hindi)</label>
              <input value={form.nameHi} onChange={(e) => set("nameHi", e.target.value)}
                placeholder="पनीर टिक्का मसाला"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
              <textarea rows={2} value={form.description} onChange={(e) => set("description", e.target.value)}
                placeholder="Short description of the dish…"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none resize-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1">Category *</label>
              <select
                required
                value={form.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Base Price (₹) *</label>
              <input required type="number" min="1" step="0.01" value={form.basePrice} onChange={(e) => set("basePrice", e.target.value)}
                placeholder="120"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Sort Order</label>
              <input type="number" min="0" value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none" />
            </div>

            {/* Toggles */}
            <div className="col-span-2 flex items-center gap-4 rounded-lg border border-border bg-surface-secondary p-3">
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer flex-1">
                <input type="checkbox" checked={form.isJain} onChange={(e) => set("isJain", e.target.checked)}
                  className="h-4 w-4 rounded border-border" />
                Jain friendly
              </label>
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer flex-1">
                <input type="checkbox" checked={form.isVegan} onChange={(e) => set("isVegan", e.target.checked)}
                  className="h-4 w-4 rounded border-border" />
                Vegan
              </label>
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer flex-1">
                <input type="checkbox" checked={form.isAvailable} onChange={(e) => set("isAvailable", e.target.checked)}
                  className="h-4 w-4 rounded border-border" />
                Available
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Confirm Delete Dialog ─────────────────────────────────────────────────────

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

// ── Slug helper ──────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ── Category Form Modal ─────────────────────────────────────────────────────

function CategoryFormModal({
  category,
  onClose,
  onSaved,
}: {
  category: ApiMenuCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!category;
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? "0"));
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(toSlug(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Category name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || toSlug(name),
        sortOrder: parseInt(sortOrder) || 0,
        isActive,
      };
      if (isEdit) {
        await updateMenuCategory(category!.id, payload);
      } else {
        await createMenuCategory(payload);
      }
      toast.success(isEdit ? "Category updated" : "Category created");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-text-primary">
            {isEdit ? "Edit Category" : "Add Category"}
          </h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Name *</label>
            <input
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Breakfast"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Slug</label>
            <input
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
              placeholder="auto-generated-from-name"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Sort Order</label>
            <input
              type="number"
              min="0"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
            />
          </div>
          {isEdit && (
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Active
            </label>
          )}
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
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Manage Categories Dialog ─────────────────────────────────────────────────

function ManageCategoriesDialog({
  onClose,
  menuItems,
}: {
  onClose: () => void;
  menuItems: ApiMenuItem[];
}) {
  const [catList, setCatList] = useState<ApiMenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [formModal, setFormModal] = useState<{ open: boolean; category: ApiMenuCategory | null }>({
    open: false,
    category: null,
  });
  const [catDeleteTarget, setCatDeleteTarget] = useState<ApiMenuCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadCategories() {
    setLoading(true);
    try {
      const cats = await getMenuCategories();
      setCatList(cats);
    } catch {
      setCatList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function getItemCount(categoryId: string): number {
    return menuItems.filter((item) => item.category?.id === categoryId).length;
  }

  async function handleCatDelete() {
    if (!catDeleteTarget) return;
    setDeleting(true);
    try {
      await deleteMenuCategory(catDeleteTarget.id);
      toast.success(`Category "${catDeleteTarget.name}" deleted`);
      setCatDeleteTarget(null);
      loadCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    } finally {
      setDeleting(false);
    }
  }

  function handleFormSaved() {
    setFormModal({ open: false, category: null });
    loadCategories();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-surface shadow-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <h2 className="text-base font-semibold text-text-primary">Manage Categories</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFormModal({ open: true, category: null })}
              className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
            <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-tertiary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading categories...
            </div>
          ) : catList.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-text-secondary">No categories found.</p>
              <button
                onClick={() => setFormModal({ open: true, category: null })}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
              >
                <Plus className="h-4 w-4" />
                Add First Category
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-secondary">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Slug</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-text-tertiary">Order</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-text-tertiary">Items</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-text-tertiary">Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-text-tertiary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {catList.map((cat) => {
                  const count = getItemCount(cat.id);
                  return (
                    <tr key={cat.id} className="hover:bg-surface-secondary transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-3.5 w-3.5 text-text-tertiary" />
                          <span className="font-medium text-text-primary">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-surface-secondary px-1.5 py-0.5 font-mono text-xs text-text-tertiary">
                          {cat.slug}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-text-secondary">{cat.sortOrder}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-medium text-text-secondary">
                          {count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            cat.isActive
                              ? "bg-success-50 text-success-700"
                              : "bg-surface-tertiary text-text-tertiary",
                          )}
                        >
                          {cat.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setFormModal({ open: true, category: cat })}
                            className="rounded-lg border border-border p-1.5 text-text-secondary hover:bg-surface-secondary hover:text-brand-600 transition-colors"
                            title="Edit category"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setCatDeleteTarget(cat)}
                            className="rounded-lg border border-border p-1.5 text-text-secondary hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Delete category"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-5 py-3">
          <p className="text-xs text-text-tertiary">
            {catList.length} {catList.length === 1 ? "category" : "categories"} total
          </p>
        </div>
      </div>

      {/* Sub-modals */}
      {formModal.open && (
        <CategoryFormModal
          category={formModal.category}
          onClose={() => setFormModal({ open: false, category: null })}
          onSaved={handleFormSaved}
        />
      )}
      {catDeleteTarget && (
        <ConfirmDeleteDialog
          open={true}
          onClose={() => setCatDeleteTarget(null)}
          onConfirm={handleCatDelete}
          name={catDeleteTarget.name}
          type="Category"
        />
      )}
    </div>
  );
}

// ── Item Slab Editor Modal ───────────────────────────────────────────────────

interface SlabRow {
  fromQty: string;
  toQty: string;
  price: string;
}

function ItemSlabEditor({ item, onClose }: { item: { id: string; name: string; price: number }; onClose: () => void }) {
  const [slabs, setSlabs] = useState<SlabRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    getMenuItemSlabs(item.id)
      .then((data) => {
        if (data.length === 0) {
          setSlabs([{ fromQty: "1", toQty: "", price: String(item.price) }]);
        } else {
          setSlabs(
            data.map((s) => ({
              fromQty: String(s.fromQty),
              toQty: s.toQty !== null ? String(s.toQty) : "",
              price: String(s.price),
            }))
          );
        }
      })
      .catch(() => {
        setSlabs([{ fromQty: "1", toQty: "", price: String(item.price) }]);
      })
      .finally(() => setLoading(false));
  }, [item.id, item.price]);

  function updateSlab(index: number, field: keyof SlabRow, value: string) {
    setSlabs((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  function addSlab() {
    const last = slabs[slabs.length - 1];
    const nextFrom = last && last.toQty ? String(parseInt(last.toQty) + 1) : "";
    setSlabs((prev) => [...prev, { fromQty: nextFrom, toQty: "", price: "" }]);
  }

  function removeSlab(index: number) {
    setSlabs((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    const parsed = slabs.map((s) => ({
      fromQty: parseInt(s.fromQty) || 0,
      toQty: s.toQty ? parseInt(s.toQty) : null,
      price: parseFloat(s.price) || 0,
    }));

    for (const slab of parsed) {
      if (slab.fromQty <= 0) {
        toast.error("From Qty must be at least 1");
        return;
      }
      if (slab.price <= 0) {
        toast.error("Price must be greater than 0");
        return;
      }
      if (slab.toQty !== null && slab.toQty < slab.fromQty) {
        toast.error("To Qty cannot be less than From Qty");
        return;
      }
    }

    setSaving(true);
    try {
      await saveMenuItemSlabs(item.id, parsed);
      toast.success("Pricing slabs saved");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save pricing slabs");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-surface shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Pricing Slabs</h2>
            <p className="text-xs text-text-secondary mt-0.5">{item.name}</p>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="rounded-lg bg-surface-secondary px-3 py-2 text-xs text-text-secondary">
            Base price: <strong className="text-text-primary">{"\u20B9"}{item.price}</strong> (used when no slab matches)
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-tertiary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading slabs...
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">From Qty</th>
                    <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">To Qty</th>
                    <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">{"\u20B9"} / Plate</th>
                    <th className="pb-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {slabs.map((slab, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min="1"
                          value={slab.fromQty}
                          onChange={(e) => updateSlab(i, "fromQty", e.target.value)}
                          className="w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min="0"
                          value={slab.toQty}
                          onChange={(e) => updateSlab(i, "toQty", e.target.value)}
                          placeholder="Unlimited"
                          className="w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={slab.price}
                          onChange={(e) => updateSlab(i, "price", e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2">
                        {slabs.length > 1 && (
                          <button
                            onClick={() => removeSlab(i)}
                            className="rounded-lg p-1.5 text-text-tertiary hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Remove slab"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                onClick={addSlab}
                className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Slab
              </button>
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-5 py-3 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
          >
            Cancel
          </button>
          <button
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function MenuPage() {
  const { can } = useAuth();
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [menuCategories, setMenuCategories] = useState<ApiMenuCategory[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [items, setItems] = useState<ApiMenuItem[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [modal, setModal] = useState<{ open: boolean; item: ApiMenuItem | null }>({ open: false, item: null });
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [showCategoriesDialog, setShowCategoriesDialog] = useState(false);
  const [slabTarget, setSlabTarget] = useState<{ id: string; name: string; price: number } | null>(null);

  useEffect(() => {
    getLocations()
      .then((locs) => {
        const active = locs.filter((l) => l.isActive && l.type !== "CENTRAL_KITCHEN");
        setLocations(active);
        if (active.length > 0) setSelectedLocationId(active[0].id);
      })
      .catch(() => setLocations([]))
      .finally(() => setIsLoadingLocations(false));
  }, []);

  useEffect(() => {
    getMenuCategories()
      .then(setMenuCategories)
      .catch(() => setMenuCategories([]));
  }, []);

  async function loadItems(locationId: string) {
    setIsLoadingItems(true);
    setSearch("");
    setCategoryFilter("all");
    try {
      const res = await getMenuItems({ locationId });
      setItems(res.data);
    } catch {
      setItems([]);
    } finally {
      setIsLoadingItems(false);
    }
  }

  useEffect(() => {
    if (!selectedLocationId) return;
    loadItems(selectedLocationId);
  }, [selectedLocationId]);

  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  const categories = useMemo(() => {
    const names = Array.from(
      new Set(items.map((i) => i.category?.name).filter(Boolean) as string[])
    ).sort();
    return ["all", ...names];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== "all" && item.category?.name !== categoryFilter) return false;
      return true;
    });
  }, [items, search, categoryFilter]);

  const veg = items.filter((i) => !i.isJain && !i.isVegan).length;
  const jain = items.filter((i) => i.isJain).length;
  const vegan = items.filter((i) => i.isVegan).length;

  function openNew() { setModal({ open: true, item: null }); }
  function openEdit(item: ApiMenuItem) { setModal({ open: true, item }); }
  function closeModal() { setModal({ open: false, item: null }); }

  function handleSaved() {
    closeModal();
    loadItems(selectedLocationId!);
  }

  async function handleToggleAvailability(item: ApiMenuItem) {
    setTogglingId(item.id);
    try {
      await toggleMenuItemAvailability(item.id, !item.isAvailable);
      setItems((prev) =>
        prev.map((i) => i.id === item.id ? { ...i, isAvailable: !item.isAvailable } : i)
      );
      toast.success(`${item.name} marked ${!item.isAvailable ? "available" : "unavailable"}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update availability");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMenuItem(deleteTarget.id);
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      toast.success(`${deleteTarget.name} deleted`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete menu item");
    }
    setDeleteTarget(null);
  }

  if (isLoadingLocations) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-text-tertiary">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading locations…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Menu</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {selectedLocation
              ? `${selectedLocation.name} · ${isLoadingItems ? "…" : `${items.length} items`}`
              : "Select a location"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {can("menu:create") && (
            <button
              onClick={() => setShowCategoriesDialog(true)}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary"
            >
              <Settings2 className="h-4 w-4" />
              Manage Categories
            </button>
          )}
          {can("menu:create") && (
            <button
              onClick={openNew}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          )}
        </div>
      </div>

      {/* Location tabs */}
      <div className="flex gap-1.5 overflow-x-auto rounded-xl border border-border bg-surface p-1.5">
        {locations.map((loc) => (
          <LocationTab key={loc.id} loc={loc} active={selectedLocationId === loc.id}
            onClick={() => setSelectedLocationId(loc.id)} />
        ))}
      </div>

      {/* Location info banner */}
      {selectedLocation && (
        <div className={cn(
          "flex items-center gap-3 rounded-xl border px-4 py-3",
          selectedLocation.isRestricted ? "border-warning-200 bg-warning-50" : "border-border bg-surface"
        )}>
          {selectedLocation.isRestricted
            ? <Lock className="h-4 w-4 shrink-0 text-warning-600" />
            : <Building2 className="h-4 w-4 shrink-0 text-text-tertiary" />}
          <div className="text-sm">
            <span className="font-semibold text-text-primary">{selectedLocation.name}</span>
            <span className="mx-2 text-text-tertiary">·</span>
            <span className="text-text-secondary">{selectedLocation.address}</span>
            <span className="mx-2 text-text-tertiary">·</span>
            {selectedLocation.isRestricted
              ? <span className="font-medium text-warning-700">Restricted — employees only</span>
              : <span className="text-text-tertiary">Open to all</span>}
            <span className="mx-2 text-text-tertiary">·</span>
            <span className="text-text-tertiary">
              Capacity {selectedLocation.dailyCapacity} meals/day · {selectedLocation.openTime}–{selectedLocation.closeTime}
            </span>
          </div>
        </div>
      )}

      {/* KPIs */}
      {!isLoadingItems && items.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Veg",   value: veg,   color: "text-brand-600",   bg: "bg-brand-50" },
            { label: "Jain",  value: jain,  color: "text-amber-600",   bg: "bg-amber-50" },
            { label: "Vegan", value: vegan, color: "text-success-600", bg: "bg-success-50" },
          ].map((k) => (
            <div key={k.label} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", k.bg)}>
                <Leaf className={cn("h-4 w-4", k.color)} />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">{k.value}</p>
                <p className="text-xs text-text-secondary">{k.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-4 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
          />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface py-2 pl-3 pr-8 text-sm text-text-primary focus:border-brand-500 focus:outline-none">
          <option value="all">All Categories</option>
          {categories.slice(1).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Content */}
      {isLoadingItems ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-text-tertiary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading menu…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-20 text-center">
          <UtensilsCrossed className="mx-auto mb-3 h-10 w-10 text-text-tertiary" />
          <p className="text-sm font-medium text-text-secondary">
            {items.length === 0
              ? "No menu items assigned to this location yet."
              : "No items match your search."}
          </p>
          {items.length === 0 && can("menu:create") && (
            <button onClick={openNew}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              <Plus className="h-4 w-4" /> Add First Item
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Item</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary sm:table-cell">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Diet</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-tertiary">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Available</th>
                {(can("menu:edit") || can("menu:create")) && (
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-surface-secondary transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-text-primary">{item.name}</span>
                      {item.nameHi && <span className="ml-2 text-xs text-text-tertiary">{item.nameHi}</span>}
                    </div>
                    {item.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-text-tertiary">{item.description}</p>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {item.category ? (
                      <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                        {item.category.name}
                      </span>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <DietBadge isJain={item.isJain} isVegan={item.isVegan} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-text-primary">₹{item.basePrice}</td>
                  <td className="px-4 py-3">
                    {can("menu:edit") ? (
                      <button
                        onClick={() => handleToggleAvailability(item)}
                        disabled={togglingId === item.id}
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors",
                          item.isAvailable
                            ? "bg-success-50 text-success-700 hover:bg-success-100"
                            : "bg-surface-tertiary text-text-tertiary hover:bg-surface-secondary",
                          togglingId === item.id && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {item.isAvailable ? "Available" : "Unavailable"}
                      </button>
                    ) : (
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        item.isAvailable ? "bg-success-50 text-success-700" : "bg-surface-tertiary text-text-tertiary"
                      )}>
                        {item.isAvailable ? "Available" : "Unavailable"}
                      </span>
                    )}
                  </td>
                  {(can("menu:edit") || can("menu:create")) && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {can("menu:edit") && (
                          <button onClick={() => openEdit(item)}
                            className="rounded-lg border border-border p-1.5 text-text-secondary hover:bg-surface-secondary hover:text-brand-600 transition-colors"
                            title="Edit">
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {can("menu:edit") && (
                          <button onClick={() => setSlabTarget({ id: item.id, name: item.name, price: item.basePrice })}
                            className="rounded-lg border border-border p-1.5 text-text-secondary hover:bg-surface-secondary hover:text-brand-600 transition-colors"
                            title="Pricing Slabs">
                            <IndianRupee className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {can("menu:edit") && (
                          <button onClick={() => setDeleteTarget({ id: item.id, name: item.name })}
                            className="rounded-lg border border-border p-1.5 text-text-secondary hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                            title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-border px-4 py-2.5 text-xs text-text-tertiary">
            {filtered.length} of {items.length} items at this location
          </div>
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <MenuItemModal
          item={modal.item}
          categories={menuCategories}
          locationId={selectedLocationId}
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
        type="Menu Item"
      />

      {/* Category Management Dialog */}
      {showCategoriesDialog && (
        <ManageCategoriesDialog
          onClose={() => setShowCategoriesDialog(false)}
          menuItems={items}
        />
      )}

      {/* Item Slab Editor */}
      {slabTarget && (
        <ItemSlabEditor
          item={slabTarget}
          onClose={() => setSlabTarget(null)}
        />
      )}
    </div>
  );
}
