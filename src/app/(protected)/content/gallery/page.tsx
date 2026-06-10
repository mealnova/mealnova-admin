"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Edit, History, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { updateCmsEntryStatus, type CmsWorkflowStatus } from "@/lib/api";
import {
  AssetPickerField,
  RevisionHistoryPanel,
  TaxonomySelectField,
  WorkflowStatusField,
} from "@/components/cms/foundation-controls";
import {
  contentKeys,
  useGallery,
  useCreateGalleryItem,
  useUpdateGalleryItem,
  useDeleteGalleryItem,
  type GalleryItem,
} from "@/lib/queries/content";
import { deriveWorkflowStatus } from "@/lib/queries/cms-foundation";

function statusFor(item: GalleryItem) {
  const status = deriveWorkflowStatus({
    status: item.status ?? null,
    isPublished: item.isPublished,
  });

  switch (status) {
    case "IN_REVIEW":
      return {
        label: "In Review",
        className: "bg-sky-50 text-sky-700",
      };
    case "PUBLISHED":
      return {
        label: "Published",
        className: "bg-brand-50 text-brand-700",
      };
    case "ARCHIVED":
      return {
        label: "Archived",
        className: "bg-slate-100 text-slate-700",
      };
    default:
      return {
        label: "Draft",
        className: "bg-surface-secondary text-text-tertiary",
      };
  }
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function GalleryModal({
  item,
  onClose,
}: {
  item: GalleryItem | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: item?.title ?? "",
    imageUrl: item?.imageUrl ?? "",
    imageAssetId: item?.primaryAssetId ?? "",
    category: item?.category ?? "food",
    categoryTermId: item?.categoryTermId ?? "",
    sortOrder: item?.sortOrder ?? 0,
    isFeatured: item?.isFeatured ?? false,
    status: deriveWorkflowStatus(item ?? { isPublished: true }),
  });
  const [saving, setSaving] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  const create = useCreateGalleryItem();
  const update = useUpdateGalleryItem();

  function set(field: string, value: string | boolean | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.imageAssetId && !form.imageUrl.trim()) {
      toast.error("Gallery items require an asset");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        imageUrl: form.imageUrl.trim() || null,
        imageAssetId: form.imageAssetId || null,
        category: form.category,
        categoryTermId: form.categoryTermId || null,
        sortOrder: form.sortOrder,
        isFeatured: form.isFeatured,
        isPublished: form.status === "PUBLISHED",
      };
      const saved = item
        ? await update.mutateAsync({ id: item.id, data: payload })
        : await create.mutateAsync(payload as any);
      await updateCmsEntryStatus("gallery", String(saved.id), {
        status: form.status,
        publishedAt: null,
      });
      await queryClient.invalidateQueries({ queryKey: contentKeys.gallery });
      if (item) {
        toast.success("Updated successfully");
      } else {
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
            {item ? "Edit" : "Add"} Gallery Item
          </h2>
          {item ? (
            <button
              type="button"
              onClick={() => setShowRevisions(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary"
            >
              <History className="h-3.5 w-3.5" />
              Revisions
            </button>
          ) : null}
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Title *</label>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Wedding Reception — Balewadi"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <AssetPickerField
            label="Gallery Asset"
            valueAssetId={form.imageAssetId || null}
            valueImageUrl={form.imageUrl || null}
            onChange={(next) => {
              set("imageAssetId", next.assetId ?? "");
              set("imageUrl", next.imageUrl ?? "");
            }}
            helperText="Gallery items should be backed by a CMS asset."
          />
          <TaxonomySelectField
            taxonomyKey="gallery-category"
            label="Category"
            valueTermId={form.categoryTermId || null}
            fallbackSlug={form.category}
            onChange={(next) => {
              set("categoryTermId", next.termId ?? "");
              set("category", next.slug ?? "");
            }}
            helperText="Use canonical gallery categories from the CMS taxonomy."
          />
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Sort Order</label>
            <input
              type="number"
              min="0"
              value={form.sortOrder}
              onChange={(e) => set("sortOrder", parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-4 rounded-lg border border-border bg-surface-secondary p-3">
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => set("isFeatured", e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Featured
            </label>
          </div>
          <WorkflowStatusField
            status={form.status}
            publishedAt=""
            onStatusChange={(status) => set("status", status === "SCHEDULED" ? "PUBLISHED" : status)}
            onPublishedAtChange={() => {}}
            allowScheduled={false}
          />
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
        {item ? (
          <RevisionHistoryPanel
            collection="gallery"
            entryId={String(item.id)}
            isOpen={showRevisions}
            onClose={() => setShowRevisions(false)}
            onRestored={() => {
              queryClient.invalidateQueries({ queryKey: contentKeys.gallery });
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GalleryPage() {
  const { data: items = [], isLoading } = useGallery();
  const del = useDeleteGalleryItem();
  const [editing, setEditing] = useState<GalleryItem | "new" | null>(null);

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
          <h1 className="text-xl font-semibold text-text-primary">Gallery</h1>
          <p className="text-sm text-text-secondary mt-0.5">Manage photo gallery items</p>
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Featured</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-secondary/50">
                  <td className="px-4 py-3 text-text-primary font-medium">{item.title}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] font-medium text-text-secondary capitalize">
                      {item.category ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <input type="checkbox" readOnly checked={!!item.isFeatured} className="h-4 w-4 rounded border-border" />
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const status = statusFor(item);
                      return (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      );
                    })()}
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
        <GalleryModal
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
