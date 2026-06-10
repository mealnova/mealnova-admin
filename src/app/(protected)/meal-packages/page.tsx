"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Plus, Loader2, X, Trash2, Edit, Search, Minus, Star,
} from "lucide-react";
import {
  getMealPackages, createMealPackage, updateMealPackage, deleteMealPackage,
  getMenuItems, getMenuCategories,
  type MealPackage,
  type ApiMenuItem, type ApiMenuCategory,
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

// ── Meal slot labels ──────────────────────────────────────────────────────────

const MEAL_SLOTS = [
  { value: "", label: "Any" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "snacks", label: "Snacks" },
  { value: "dinner", label: "Dinner" },
];

function mealSlotLabel(slot: string | null): string {
  return MEAL_SLOTS.find((s) => s.value === (slot ?? ""))?.label ?? "Any";
}

// ── Selected item in builder ──────────────────────────────────────────────────

interface SelectedItem {
  menuItemId: string;
  name: string;
  categoryName: string;
  price: number;
  isJain: boolean;
  isVegan: boolean;
  quantity: number;
}

// ── Confirm Delete Dialog ─────────────────────────────────────────────────────

function ConfirmDeleteDialog({
  open, onClose, onConfirm, name,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  name: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Delete Package?</h3>
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

// ── Package Builder Modal ─────────────────────────────────────────────────────

function PackageBuilderModal({
  pkg,
  onClose,
  onSaved,
}: {
  pkg: MealPackage | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!pkg;

  // Form state
  const [name, setName] = useState(pkg?.name ?? "");
  const [description, setDescription] = useState(pkg?.description ?? "");
  const [mealSlot, setMealSlot] = useState(pkg?.mealSlot ?? "");
  const [isPopular, setIsPopular] = useState(pkg?.isPopular ?? false);

  // Selected items for the package
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>(() => {
    if (!pkg) return [];
    return pkg.items.map((pi) => ({
      menuItemId: pi.menuItem.id,
      name: pi.menuItem.name,
      categoryName: "",
      price: pi.menuItem.price,
      isJain: pi.menuItem.isJain,
      isVegan: pi.menuItem.isVegan,
      quantity: pi.quantity,
    }));
  });

  // Menu items + categories for the picker
  const [menuItems, setMenuItems] = useState<ApiMenuItem[]>([]);
  const [categories, setCategories] = useState<ApiMenuCategory[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [saving, setSaving] = useState(false);

  // Item picker filters
  const [itemSearch, setItemSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    Promise.all([
      getMenuItems().catch(() => ({ data: [] })),
      getMenuCategories().catch(() => []),
    ]).then(([itemsRes, cats]) => {
      const items = Array.isArray(itemsRes) ? itemsRes : (itemsRes as any).data ?? [];
      setMenuItems(items);
      setCategories(Array.isArray(cats) ? cats : []);

      // Backfill category names for edit mode
      if (pkg) {
        setSelectedItems((prev) =>
          prev.map((si) => {
            const found = items.find((mi: ApiMenuItem) => mi.id === si.menuItemId);
            return found ? { ...si, categoryName: found.category?.name ?? "" } : si;
          }),
        );
      }
    }).finally(() => setLoadingItems(false));
  }, []);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (categoryFilter !== "all" && item.category?.id !== categoryFilter) return false;
      if (itemSearch && !item.name.toLowerCase().includes(itemSearch.toLowerCase())) return false;
      return true;
    });
  }, [menuItems, itemSearch, categoryFilter]);

  // Calculated total
  const total = useMemo(
    () => selectedItems.reduce((sum, si) => sum + si.price * si.quantity, 0),
    [selectedItems],
  );

  function addItem(item: ApiMenuItem) {
    if (selectedItems.some((si) => si.menuItemId === item.id)) {
      toast.error(`${item.name} is already added`);
      return;
    }
    setSelectedItems((prev) => [
      ...prev,
      {
        menuItemId: item.id,
        name: item.name,
        categoryName: item.category?.name ?? "",
        price: item.basePrice,
        isJain: item.isJain,
        isVegan: item.isVegan,
        quantity: 1,
      },
    ]);
  }

  function removeItem(menuItemId: string) {
    setSelectedItems((prev) => prev.filter((si) => si.menuItemId !== menuItemId));
  }

  function updateQuantity(menuItemId: string, delta: number) {
    setSelectedItems((prev) =>
      prev.map((si) => {
        if (si.menuItemId !== menuItemId) return si;
        const newQty = Math.max(1, si.quantity + delta);
        return { ...si, quantity: newQty };
      }),
    );
  }

  function setQuantity(menuItemId: string, qty: number) {
    setSelectedItems((prev) =>
      prev.map((si) => {
        if (si.menuItemId !== menuItemId) return si;
        return { ...si, quantity: Math.max(1, qty) };
      }),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Package name is required"); return; }
    if (selectedItems.length === 0) { toast.error("Add at least one menu item"); return; }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        mealSlot: mealSlot || undefined,
        isPopular,
        items: selectedItems.map((si) => ({
          menuItemId: si.menuItemId,
          quantity: si.quantity,
        })),
      };

      if (isEdit) {
        await updateMealPackage(pkg!.id, payload);
        toast.success("Package updated");
      } else {
        await createMealPackage(payload);
        toast.success("Package created");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to save package");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-surface shadow-xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <h2 className="text-base font-semibold text-text-primary">
            {isEdit ? `Edit — ${pkg!.name}` : "Create Meal Package"}
          </h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Package details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Package Name *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Standard Thali, Jain Special Thali"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the package..."
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Meal Slot</label>
                <select
                  value={mealSlot}
                  onChange={(e) => setMealSlot(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                >
                  {MEAL_SLOTS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPopular}
                    onChange={(e) => setIsPopular(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Mark as Popular
                </label>
              </div>
            </div>

            {/* Two-column: Item Picker + Selected Items */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* LEFT: Item Picker */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text-primary">Browse Menu Items</h3>

                {/* Search + Category filter */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
                    <input
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Search items..."
                      className="w-full rounded-lg border border-border bg-white py-1.5 pl-8 pr-3 text-xs text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-lg border border-border bg-white py-1.5 pl-2 pr-6 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Item list */}
                <div className="border border-border rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  {loadingItems ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-xs text-text-tertiary">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading items...
                    </div>
                  ) : filteredMenuItems.length === 0 ? (
                    <div className="py-10 text-center text-xs text-text-tertiary">
                      No items found
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-surface-secondary">
                          <th className="px-3 py-2 text-left font-semibold text-text-tertiary uppercase tracking-wider">Item</th>
                          <th className="px-3 py-2 text-left font-semibold text-text-tertiary uppercase tracking-wider">Diet</th>
                          <th className="px-3 py-2 text-right font-semibold text-text-tertiary uppercase tracking-wider">Price</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredMenuItems.map((item) => {
                          const alreadyAdded = selectedItems.some((si) => si.menuItemId === item.id);
                          return (
                            <tr
                              key={item.id}
                              className={cn(
                                "transition-colors",
                                alreadyAdded ? "bg-brand-50/50" : "hover:bg-surface-secondary"
                              )}
                            >
                              <td className="px-3 py-2">
                                <span className="font-medium text-text-primary">{item.name}</span>
                                {item.category && (
                                  <span className="ml-1.5 text-text-tertiary">({item.category.name})</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <DietBadge isJain={item.isJain} isVegan={item.isVegan} />
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-text-primary">
                                ₹{item.basePrice}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => addItem(item)}
                                  disabled={alreadyAdded}
                                  className={cn(
                                    "rounded-md px-2 py-1 text-[11px] font-semibold transition-colors",
                                    alreadyAdded
                                      ? "bg-surface-secondary text-text-tertiary cursor-not-allowed"
                                      : "bg-brand-500 text-white hover:bg-brand-600"
                                  )}
                                >
                                  {alreadyAdded ? "Added" : "+ Add"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* RIGHT: Selected Items */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text-primary">
                  Package Items ({selectedItems.length})
                </h3>

                {selectedItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border py-12 text-center">
                    <p className="text-xs text-text-tertiary">
                      Add menu items from the left to build the package
                    </p>
                  </div>
                ) : (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-surface-secondary">
                          <th className="px-3 py-2 text-left font-semibold text-text-tertiary uppercase tracking-wider">Item</th>
                          <th className="px-3 py-2 text-right font-semibold text-text-tertiary uppercase tracking-wider">Unit ₹</th>
                          <th className="px-3 py-2 text-center font-semibold text-text-tertiary uppercase tracking-wider">Qty</th>
                          <th className="px-3 py-2 text-right font-semibold text-text-tertiary uppercase tracking-wider">Subtotal</th>
                          <th className="px-3 py-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedItems.map((si) => (
                          <tr key={si.menuItemId} className="hover:bg-surface-secondary transition-colors">
                            <td className="px-3 py-2">
                              <div>
                                <span className="font-medium text-text-primary">{si.name}</span>
                                {si.categoryName && (
                                  <span className="ml-1.5 text-text-tertiary">({si.categoryName})</span>
                                )}
                              </div>
                              <DietBadge isJain={si.isJain} isVegan={si.isVegan} />
                            </td>
                            <td className="px-3 py-2 text-right text-text-secondary">
                              ₹{si.price}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(si.menuItemId, -1)}
                                  disabled={si.quantity <= 1}
                                  className="rounded-md border border-border p-0.5 text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  value={si.quantity}
                                  onChange={(e) => setQuantity(si.menuItemId, parseInt(e.target.value) || 1)}
                                  className="w-10 rounded border border-border bg-white px-1 py-0.5 text-center text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(si.menuItemId, 1)}
                                  className="rounded-md border border-border p-0.5 text-text-secondary hover:bg-surface-secondary"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-text-primary">
                              ₹{si.price * si.quantity}
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => removeItem(si.menuItemId)}
                                className="rounded-md p-1 text-text-tertiary hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="Remove"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Running Total */}
                    <div className="border-t border-border bg-brand-50 px-4 py-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-text-primary">Package Total</span>
                      <span className="text-lg font-bold text-brand-700">₹{total}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="border-t border-border px-6 py-4 flex gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Package"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MealPackagesPage() {
  const { can } = useAuth();
  const [packages, setPackages] = useState<MealPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; pkg: MealPackage | null }>({ open: false, pkg: null });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  async function loadPackages() {
    setLoading(true);
    try {
      const data = await getMealPackages();
      setPackages(Array.isArray(data) ? data : []);
    } catch {
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPackages();
  }, []);

  function openCreate() {
    setModal({ open: true, pkg: null });
  }

  function openEdit(pkg: MealPackage) {
    setModal({ open: true, pkg });
  }

  function closeModal() {
    setModal({ open: false, pkg: null });
  }

  function handleSaved() {
    closeModal();
    loadPackages();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMealPackage(deleteTarget.id);
      setPackages((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast.success(`${deleteTarget.name} deleted`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete package");
    }
    setDeleteTarget(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-text-tertiary">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading meal packages...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Meal Packages</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Build thalis and combos from menu items. Prices are calculated dynamically.
          </p>
        </div>
        {can("menu:create") && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" />
            Create Package
          </button>
        )}
      </div>

      {/* KPIs */}
      {packages.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50">
              <Star className="h-4 w-4 text-brand-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{packages.length}</p>
              <p className="text-xs text-text-secondary">Total Packages</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50">
              <Star className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">
                {packages.filter((p) => p.isPopular).length}
              </p>
              <p className="text-xs text-text-secondary">Popular</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-success-50">
              <Star className="h-4 w-4 text-success-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">
                ₹{packages.length > 0
                  ? Math.round(packages.reduce((s, p) => s + p.calculatedPrice, 0) / packages.length)
                  : 0}
              </p>
              <p className="text-xs text-text-secondary">Avg Price</p>
            </div>
          </div>
        </div>
      )}

      {/* Package List */}
      {packages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-20 text-center">
          <Star className="mx-auto mb-3 h-10 w-10 text-text-tertiary" />
          <p className="text-sm font-medium text-text-secondary">
            No meal packages created yet.
          </p>
          {can("menu:create") && (
            <button
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" /> Create First Package
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Package</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary sm:table-cell">Meal Slot</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-tertiary">Items</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-tertiary">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Status</th>
                {(can("menu:edit") || can("menu:create")) && (
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {packages.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-surface-secondary transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">{pkg.name}</span>
                      {pkg.isPopular && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Popular</span>
                      )}
                    </div>
                    {pkg.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-text-tertiary">{pkg.description}</p>
                    )}
                    {/* Show item names in a muted list */}
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-text-tertiary">
                      {pkg.items.map((pi) => `${pi.quantity}x ${pi.menuItem.name}`).join(", ")}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                      {mealSlotLabel(pkg.mealSlot)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                      {pkg.items.length}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-brand-700">
                    ₹{pkg.calculatedPrice}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        pkg.isActive
                          ? "bg-success-50 text-success-700"
                          : "bg-surface-tertiary text-text-tertiary"
                      )}
                    >
                      {pkg.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {(can("menu:edit") || can("menu:create")) && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {can("menu:edit") && (
                          <button
                            onClick={() => openEdit(pkg)}
                            className="rounded-lg border border-border p-1.5 text-text-secondary hover:bg-surface-secondary hover:text-brand-600 transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {can("menu:edit") && (
                          <button
                            onClick={() => setDeleteTarget({ id: pkg.id, name: pkg.name })}
                            className="rounded-lg border border-border p-1.5 text-text-secondary hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                            title="Delete"
                          >
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
            {packages.length} package{packages.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <PackageBuilderModal
          pkg={modal.pkg}
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
      />
    </div>
  );
}
