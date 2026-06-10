"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Tag, X } from "lucide-react";
import { toast } from "sonner";
import type { CmsTaxonomyTerm } from "@/lib/api";
import {
  findCmsTaxonomy,
  useCmsTaxonomies,
  useCmsTaxonomyTerms,
  useCreateCmsTaxonomyTerm,
  useUpdateCmsTaxonomyTerm,
} from "@/lib/queries/cms-foundation";

const MANAGED_TAXONOMIES = [
  "blog-category",
  "gallery-category",
  "faq-category",
  "pricing-category",
] as const;

function TaxonomyTermModal({
  taxonomyKey,
  term,
  onClose,
}: {
  taxonomyKey: string;
  term: CmsTaxonomyTerm | null;
  onClose: () => void;
}) {
  const createTerm = useCreateCmsTaxonomyTerm(taxonomyKey);
  const updateTerm = useUpdateCmsTaxonomyTerm(taxonomyKey);
  const [form, setForm] = useState({
    slug: term?.slug ?? "",
    label: term?.label ?? "",
    description: term?.description ?? "",
    sortOrder: term?.sortOrder ?? 0,
    isActive: term?.isActive ?? true,
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.label.trim()) {
      toast.error("Label is required");
      return;
    }

    try {
      const body = {
        slug: form.slug.trim() || undefined,
        label: form.label.trim(),
        description: form.description.trim() || null,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
      };

      if (term) {
        await updateTerm.mutateAsync({ termId: term.id, body });
        toast.success("Term updated");
      } else {
        await createTerm.mutateAsync(body);
        toast.success("Term created");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save term");
    }
  }

  const saving = createTerm.isPending || updateTerm.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-text-primary">
            {term ? "Edit" : "Add"} Taxonomy Term
          </h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Label *</label>
            <input
              value={form.label}
              onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
              placeholder="Corporate Wellness"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Slug</label>
            <input
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
              placeholder="corporate-wellness"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none resize-none"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Sort Order</label>
              <input
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    sortOrder: Number.parseInt(event.target.value, 10) || 0,
                  }))
                }
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-border bg-surface-secondary px-3 py-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
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
              {saving ? "Saving..." : term ? "Save Changes" : "Create Term"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ContentTaxonomiesPage() {
  const { data: taxonomies = [], isLoading } = useCmsTaxonomies();
  const availableKeys = useMemo(
    () => MANAGED_TAXONOMIES.filter((key) => findCmsTaxonomy(taxonomies, key)),
    [taxonomies],
  );
  const [activeKey, setActiveKey] = useState<string>(MANAGED_TAXONOMIES[0]);
  const [editing, setEditing] = useState<CmsTaxonomyTerm | "new" | null>(null);
  const taxonomy = findCmsTaxonomy(taxonomies, activeKey);
  const { data: terms = [] } = useCmsTaxonomyTerms(activeKey);
  const updateTerm = useUpdateCmsTaxonomyTerm(activeKey);

  useEffect(() => {
    if (!availableKeys.length) {
      return;
    }
    if (!availableKeys.includes(activeKey as (typeof MANAGED_TAXONOMIES)[number])) {
      setActiveKey(availableKeys[0]!);
    }
  }, [activeKey, availableKeys]);

  const orderedTerms = useMemo(
    () =>
      [...terms].sort(
        (left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label),
      ),
    [terms],
  );

  async function toggleTerm(term: CmsTaxonomyTerm) {
    try {
      await updateTerm.mutateAsync({
        termId: term.id,
        body: {
          isActive: !term.isActive,
        },
      });
      toast.success(term.isActive ? "Term archived" : "Term activated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update term");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Taxonomies</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Manage canonical category terms shared across CMS editors.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          disabled={!taxonomy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Add Term
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
        <div className="rounded-2xl border border-border bg-white p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Collections
          </div>
          <div className="space-y-1">
            {MANAGED_TAXONOMIES.map((key) => {
              const item = findCmsTaxonomy(taxonomies, key);
              const active = activeKey === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveKey(key)}
                  disabled={!item}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-text-secondary hover:bg-surface-secondary"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <span>{item?.label ?? key}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-text-tertiary">
                    {item?.terms.length ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2 text-base font-semibold text-text-primary">
              <Tag className="h-4 w-4" />
              {taxonomy?.label ?? "Taxonomy"}
            </div>
            <div className="mt-1 text-sm text-text-secondary">
              {taxonomy?.description ?? "Create and maintain canonical taxonomy terms."}
            </div>
          </div>
          <div className="p-5">
            {isLoading ? (
              <div className="rounded-xl border border-border bg-surface-secondary px-4 py-6 text-sm text-text-tertiary">
                Loading taxonomies...
              </div>
            ) : !taxonomy ? (
              <div className="rounded-xl border border-border bg-surface-secondary px-4 py-6 text-sm text-text-tertiary">
                This taxonomy is not available yet.
              </div>
            ) : orderedTerms.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface-secondary px-4 py-6 text-sm text-text-tertiary">
                No terms yet. Create the first one.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-secondary">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                        Label
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                        Slug
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                        Sort
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderedTerms.map((term) => (
                      <tr key={term.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          <div className="font-medium text-text-primary">{term.label}</div>
                          {term.description ? (
                            <div className="mt-0.5 line-clamp-2 text-xs text-text-tertiary">
                              {term.description}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{term.slug}</td>
                        <td className="px-4 py-3 text-text-secondary">{term.sortOrder}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              term.isActive
                                ? "bg-brand-50 text-brand-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {term.isActive ? "Active" : "Archived"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditing(term)}
                              className="text-text-tertiary hover:text-text-primary"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleTerm(term)}
                              className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-text-secondary hover:text-text-primary"
                            >
                              {term.isActive ? "Archive" : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {editing !== null && taxonomy ? (
        <TaxonomyTermModal
          taxonomyKey={activeKey}
          term={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}
