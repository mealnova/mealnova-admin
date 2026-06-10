"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Sparkles, FlaskConical, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getMenuItem,
  getMenuCategories,
  createMenuItem,
  updateMenuItem,
  enrichMenuItemNutrition,
  getMenuItemRecipe,
  saveMenuItemRecipe,
  getIngredients,
  type ApiMenuItem,
  type ApiMenuCategory,
  type ApiRecipe,
} from "@/lib/api";
import { toast } from "sonner";

// ── Schema ─────────────────────────────────────────────────

const menuItemSchema = z.object({
  name: z.string().min(2, "Name is required (min 2 chars)"),
  nameHi: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  basePrice: z.coerce.number().min(1, "Price must be at least 1"),
  isJain: z.boolean(),
  isVegan: z.boolean(),
  isAvailable: z.boolean(),
  sortOrder: z.coerce.number().min(0).optional(),
  // Nutrition fields (per 100g, all optional)
  calories: z.coerce.number().min(0).optional().or(z.literal("")),
  protein: z.coerce.number().min(0).optional().or(z.literal("")),
  carbs: z.coerce.number().min(0).optional().or(z.literal("")),
  fat: z.coerce.number().min(0).optional().or(z.literal("")),
  fiber: z.coerce.number().min(0).optional().or(z.literal("")),
  sodium: z.coerce.number().min(0).optional().or(z.literal("")),
  sugar: z.coerce.number().min(0).optional().or(z.literal("")),
  saturatedFat: z.coerce.number().min(0).optional().or(z.literal("")),
});

type MenuItemFormData = z.infer<typeof menuItemSchema>;

const emptyDefaults: MenuItemFormData = {
  name: "",
  nameHi: "",
  description: "",
  categoryId: "",
  basePrice: 0,
  isJain: false,
  isVegan: false,
  isAvailable: true,
  sortOrder: 0,
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  fiber: "",
  sodium: "",
  sugar: "",
  saturatedFat: "",
};

// ── Component ──────────────────────────────────────────────

interface IngredientLine {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
}

export default function MenuItemEditPage() {
  const params = useParams();
  const router = useRouter();
  const menuItemId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? "";
  const isNew = menuItemId === "new";

  const [loading, setLoading] = useState(!isNew);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [itemId, setItemId] = useState<string | null>(null);
  const [nutritionSource, setNutritionSource] = useState<string | null>(null);
  const [categories, setCategories] = useState<ApiMenuCategory[]>([]);

  // Tab state
  const [activeTab, setActiveTab] = useState<"details" | "recipe">("details");

  // Recipe/BOM state
  const [recipe, setRecipe] = useState<ApiRecipe | null>(null);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeSaving, setRecipeSaving] = useState(false);
  const [recipeServings, setRecipeServings] = useState(1);
  const [recipeLines, setRecipeLines] = useState<IngredientLine[]>([]);
  const [allIngredients, setAllIngredients] = useState<{ id: string; name: string; unit: string }[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: emptyDefaults,
  });

  const watchAvailable = watch("isAvailable");

  // Load categories
  useEffect(() => {
    getMenuCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // Load existing item
  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    getMenuItem(menuItemId)
      .then((item: ApiMenuItem) => {
        setItemId(item.id);
        setNutritionSource(item.nutritionSource);
        reset({
          name: item.name,
          nameHi: item.nameHi ?? "",
          description: item.description ?? "",
          categoryId: item.category?.id ?? "",
          basePrice: item.basePrice,
          isJain: item.isJain,
          isVegan: item.isVegan,
          isAvailable: item.isAvailable,
          sortOrder: item.sortOrder,
          calories: item.calories ?? "",
          protein: item.protein ?? "",
          carbs: item.carbs ?? "",
          fat: item.fat ?? "",
          fiber: item.fiber ?? "",
          sodium: item.sodium ?? "",
          sugar: item.sugar ?? "",
          saturatedFat: item.saturatedFat ?? "",
        });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [isNew, menuItemId, reset]);

  const onSubmit = async (data: MenuItemFormData) => {
    setSaving(true);
    try {
      const toNum = (v: string | number | undefined) =>
        v === "" || v === undefined ? undefined : Number(v);

      const payload = {
        name: data.name,
        nameHi: data.nameHi || undefined,
        description: data.description || undefined,
        categoryId: data.categoryId || undefined,
        basePrice: data.basePrice,
        isJain: data.isJain,
        isVegan: data.isVegan,
        isAvailable: data.isAvailable,
        sortOrder: data.sortOrder ?? 0,
        calories: toNum(data.calories),
        protein: toNum(data.protein),
        carbs: toNum(data.carbs),
        fat: toNum(data.fat),
        fiber: toNum(data.fiber),
        sodium: toNum(data.sodium),
        sugar: toNum(data.sugar),
        saturatedFat: toNum(data.saturatedFat),
      };

      if (isNew) {
        await createMenuItem(payload);
        toast.success("Menu item created");
      } else {
        await updateMenuItem(itemId!, payload);
        toast.success("Menu item updated");
      }
      router.push("/menu");
    } catch (err: any) {
      toast.error(err.message || "Failed to save menu item");
    } finally {
      setSaving(false);
    }
  };

  const handleAutoFill = async () => {
    if (!itemId) return;
    setEnriching(true);
    try {
      const result = await enrichMenuItemNutrition(itemId);
      if (!result.enriched) {
        toast.warning(result.message ?? "No Edamam match found for this item");
        return;
      }
      // Update form fields with enriched values
      setValue("calories", result.calories ?? "", { shouldDirty: true });
      setValue("protein", result.protein ?? "", { shouldDirty: true });
      setValue("carbs", result.carbs ?? "", { shouldDirty: true });
      setValue("fat", result.fat ?? "", { shouldDirty: true });
      setValue("fiber", result.fiber ?? "", { shouldDirty: true });
      setValue("sodium", result.sodium ?? "", { shouldDirty: true });
      setValue("sugar", result.sugar ?? "", { shouldDirty: true });
      setValue("saturatedFat", result.saturatedFat ?? "", { shouldDirty: true });
      setNutritionSource("Edamam");
      toast.success("Nutrition data filled from Edamam");
    } catch (err: any) {
      if (err.message?.includes("not configured") || err.message?.includes("EDAMAM")) {
        toast.error("Edamam not configured — add EDAMAM_APP_ID and EDAMAM_APP_KEY to .env");
      } else {
        toast.error(err.message || "Failed to fetch nutrition data");
      }
    } finally {
      setEnriching(false);
    }
  };

  // Load recipe when tab switches to "recipe" and we have a saved item
  const loadRecipe = useCallback(async () => {
    if (!itemId) return;
    setRecipeLoading(true);
    try {
      const r = await getMenuItemRecipe(itemId);
      setRecipe(r);
      if (r) {
        setRecipeServings(r.servings);
        setRecipeLines(
          r.ingredients.map((ri) => ({
            ingredientId: ri.ingredientId,
            ingredientName: ri.ingredient.name,
            quantity: ri.quantity,
            unit: ri.unit,
          })),
        );
      }
    } catch {
      // no recipe yet — that's fine
    } finally {
      setRecipeLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    if (activeTab === "recipe" && itemId) {
      loadRecipe();
      getIngredients()
        .then((res) => setAllIngredients(Array.isArray(res) ? res : (res as any).data ?? []))
        .catch(() => {});
    }
  }, [activeTab, itemId, loadRecipe]);

  const handleSaveRecipe = async () => {
    if (!itemId) return;
    setRecipeSaving(true);
    try {
      await saveMenuItemRecipe(itemId, {
        servings: recipeServings,
        lines: recipeLines.map((l) => ({ ingredientId: l.ingredientId, quantity: l.quantity, unit: l.unit })),
      });
      toast.success("Recipe saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save recipe");
    } finally {
      setRecipeSaving(false);
    }
  };

  const addIngredientLine = (ingredient: { id: string; name: string; unit: string }) => {
    if (recipeLines.find((l) => l.ingredientId === ingredient.id)) {
      toast.warning("Ingredient already in recipe");
      return;
    }
    setRecipeLines((prev) => [
      ...prev,
      { ingredientId: ingredient.id, ingredientName: ingredient.name, quantity: 1, unit: ingredient.unit },
    ]);
    setIngredientSearch("");
  };

  const removeIngredientLine = (ingredientId: string) => {
    setRecipeLines((prev) => prev.filter((l) => l.ingredientId !== ingredientId));
  };

  const filteredIngredients = allIngredients.filter(
    (i) =>
      ingredientSearch.length > 0 &&
      i.name.toLowerCase().includes(ingredientSearch.toLowerCase()) &&
      !recipeLines.find((l) => l.ingredientId === i.id),
  );

  const inputClass =
    "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20";
  const labelClass = "block text-sm font-medium text-text-primary mb-1.5";
  const errorClass = "mt-1 text-xs text-danger-500";

  // Loading state
  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:bg-surface-secondary"
          >
            <ArrowLeft className="h-4 w-4 text-text-secondary" />
          </Link>
          <div className="h-7 w-48 animate-pulse rounded bg-surface-secondary" />
        </div>
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-6">
              <div className="h-5 w-32 animate-pulse rounded bg-surface-secondary mb-4" />
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-10 animate-pulse rounded-lg bg-surface-secondary" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Not found state
  if (notFound) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:bg-surface-secondary"
          >
            <ArrowLeft className="h-4 w-4 text-text-secondary" />
          </Link>
          <h1 className="text-2xl font-semibold text-text-primary">Menu Item Not Found</h1>
        </div>
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-text-secondary mb-4">
            The menu item you are looking for does not exist or has been removed.
          </p>
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:bg-surface-secondary"
          >
            <ArrowLeft className="h-4 w-4 text-text-secondary" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              {isNew ? "Add Menu Item" : "Edit Menu Item"}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {isNew ? "Create a new dish for your catalog" : "Update dish details and availability"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs — only show on existing items */}
      {!isNew && (
        <div className="flex gap-1 border-b border-border">
          {(["details", "recipe"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTab(t)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors",
                activeTab === t
                  ? "border-brand-500 text-brand-600"
                  : "border-transparent text-text-secondary hover:text-text-primary",
              )}
            >
              {t === "details" ? <Save className="h-3.5 w-3.5" /> : <FlaskConical className="h-3.5 w-3.5" />}
              {t === "details" ? "Item Details" : "Recipe / BOM"}
            </button>
          ))}
        </div>
      )}

      {/* Recipe / BOM Tab */}
      {activeTab === "recipe" && !isNew && (
        <div className="space-y-6">
          {recipeLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          ) : (
            <>
              {/* Servings */}
              <div className="rounded-xl border border-border bg-surface p-6">
                <h2 className="mb-4 text-base font-semibold text-text-primary">Recipe Settings</h2>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-text-primary">Servings this recipe yields</label>
                  <input
                    type="number"
                    min={1}
                    value={recipeServings}
                    onChange={(e) => setRecipeServings(Number(e.target.value))}
                    className="h-10 w-24 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20"
                  />
                </div>
              </div>

              {/* Ingredient lines */}
              <div className="rounded-xl border border-border bg-surface p-6">
                <h2 className="mb-4 text-base font-semibold text-text-primary">Ingredients</h2>

                {/* Search to add */}
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Search ingredients to add..."
                    value={ingredientSearch}
                    onChange={(e) => setIngredientSearch(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20"
                  />
                  {filteredIngredients.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-white shadow-lg max-h-48 overflow-auto">
                      {filteredIngredients.slice(0, 10).map((ing) => (
                        <li key={ing.id}>
                          <button
                            type="button"
                            onClick={() => addIngredientLine(ing)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-surface-secondary flex items-center justify-between"
                          >
                            <span>{ing.name}</span>
                            <span className="text-xs text-text-secondary">{ing.unit}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {recipeLines.length === 0 ? (
                  <div className="text-center py-8 text-text-secondary text-sm border border-dashed border-border rounded-lg">
                    No ingredients yet. Search and add ingredients above.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-text-secondary border-b border-border">
                        <th className="pb-2 font-medium">Ingredient</th>
                        <th className="pb-2 font-medium text-right">Quantity</th>
                        <th className="pb-2 font-medium">Unit</th>
                        <th className="pb-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {recipeLines.map((line) => (
                        <tr key={line.ingredientId}>
                          <td className="py-2.5 font-medium text-text-primary">{line.ingredientName}</td>
                          <td className="py-2.5 text-right pr-3">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={line.quantity}
                              onChange={(e) =>
                                setRecipeLines((prev) =>
                                  prev.map((l) =>
                                    l.ingredientId === line.ingredientId
                                      ? { ...l, quantity: Number(e.target.value) }
                                      : l,
                                  ),
                                )
                              }
                              className="h-8 w-24 rounded border border-border px-2 text-sm text-right focus:outline-none focus:ring-1 focus:ring-brand-400"
                            />
                          </td>
                          <td className="py-2.5">
                            <input
                              type="text"
                              value={line.unit}
                              onChange={(e) =>
                                setRecipeLines((prev) =>
                                  prev.map((l) =>
                                    l.ingredientId === line.ingredientId
                                      ? { ...l, unit: e.target.value }
                                      : l,
                                  ),
                                )
                              }
                              className="h-8 w-20 rounded border border-border px-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400"
                            />
                          </td>
                          <td className="py-2.5 pl-3">
                            <button
                              type="button"
                              onClick={() => removeIngredientLine(line.ingredientId)}
                              className="h-8 w-8 flex items-center justify-center rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Save recipe */}
              <div className="flex justify-end gap-3 rounded-xl border border-border bg-surface px-6 py-4">
                <button
                  type="button"
                  onClick={handleSaveRecipe}
                  disabled={recipeSaving}
                  className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {recipeSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Recipe
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className={cn("space-y-6", activeTab !== "details" && "hidden")}>
        {/* Names */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-base font-semibold text-text-primary">Item Names</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Name (English) *</label>
              <input {...register("name")} className={inputClass} placeholder="e.g. Paneer Butter Masala" />
              {errors.name && <p className={errorClass}>{errors.name.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Name (Hindi)</label>
              <input {...register("nameHi")} className={inputClass} placeholder="हिंदी नाम" />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelClass}>Description</label>
            <textarea
              {...register("description")}
              rows={3}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 resize-none"
              placeholder="Brief description of the dish..."
            />
          </div>
        </div>

        {/* Category & Pricing */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-base font-semibold text-text-primary">Category & Pricing</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Category</label>
              <select {...register("categoryId")} className={inputClass}>
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Base Price (INR) *</label>
              <input {...register("basePrice")} type="number" className={inputClass} placeholder="0" />
              {errors.basePrice && <p className={errorClass}>{errors.basePrice.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Sort Order</label>
              <input {...register("sortOrder")} type="number" className={inputClass} placeholder="0" />
            </div>
          </div>
        </div>

        {/* Dietary & Attributes */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-base font-semibold text-text-primary">Dietary Tags</h2>
          <div className="flex gap-4">
            {(["isJain", "isVegan"] as const).map((field) => {
              const label = field === "isJain" ? "Jain" : "Vegan";
              return (
                <label key={field} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm transition-colors hover:bg-surface-secondary">
                  <input type="checkbox" {...register(field)} className="h-4 w-4 rounded border-border accent-brand-500" />
                  <span className="text-text-primary">{label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Nutrition Information */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-text-primary">Nutrition Information</h2>
              <span className="text-xs text-text-secondary">(per 100g)</span>
              {nutritionSource && (
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  nutritionSource === "Edamam"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                )}>
                  {nutritionSource}
                </span>
              )}
            </div>
            {!isNew && (
              <button
                type="button"
                onClick={handleAutoFill}
                disabled={enriching}
                className="flex items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-50"
              >
                {enriching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {enriching ? "Fetching..." : "Auto-fill from Edamam"}
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Calories (kcal)</label>
              <input
                {...register("calories")}
                type="number"
                step="0.1"
                className={inputClass}
                placeholder="—"
              />
            </div>
            <div>
              <label className={labelClass}>Protein (g)</label>
              <input
                {...register("protein")}
                type="number"
                step="0.1"
                className={inputClass}
                placeholder="—"
              />
            </div>
            <div>
              <label className={labelClass}>Carbs (g)</label>
              <input
                {...register("carbs")}
                type="number"
                step="0.1"
                className={inputClass}
                placeholder="—"
              />
            </div>
            <div>
              <label className={labelClass}>Fat (g)</label>
              <input
                {...register("fat")}
                type="number"
                step="0.1"
                className={inputClass}
                placeholder="—"
              />
            </div>
            <div>
              <label className={labelClass}>Fiber (g)</label>
              <input
                {...register("fiber")}
                type="number"
                step="0.1"
                className={inputClass}
                placeholder="—"
              />
            </div>
            <div>
              <label className={labelClass}>Sodium (mg)</label>
              <input
                {...register("sodium")}
                type="number"
                step="0.1"
                className={inputClass}
                placeholder="—"
              />
            </div>
            <div>
              <label className={labelClass}>Sugar (g)</label>
              <input
                {...register("sugar")}
                type="number"
                step="0.1"
                className={inputClass}
                placeholder="—"
              />
            </div>
            <div>
              <label className={labelClass}>Saturated Fat (g)</label>
              <input
                {...register("saturatedFat")}
                type="number"
                step="0.1"
                className={inputClass}
                placeholder="—"
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-text-secondary">
            Values are per 100g. Click "Auto-fill from Edamam" to populate automatically using the item name.
          </p>
        </div>

        {/* Availability */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-base font-semibold text-text-primary">Availability</h2>
          <div>
            <button
              type="button"
              onClick={() => setValue("isAvailable", !watchAvailable, { shouldDirty: true })}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                watchAvailable ? "bg-success-500" : "bg-slate-300"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  watchAvailable ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
            <span className="ml-3 text-sm text-text-secondary">
              {watchAvailable ? "Available for ordering" : "Not available"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 rounded-xl border border-border bg-surface px-6 py-4">
          <Link
            href="/menu"
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!isDirty || saving}
            className={cn(
              "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors",
              isDirty && !saving
                ? "bg-brand-500 hover:bg-brand-600"
                : "cursor-not-allowed bg-brand-300"
            )}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : isNew ? "Create Item" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
