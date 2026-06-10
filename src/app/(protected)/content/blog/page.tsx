"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Edit, History, Plus, Trash2, X } from "lucide-react";
import {
  buildBlogCategoryOptions,
  formatBlogCategoryLabel,
  normalizeBlogCategoryId,
} from "@mealnova/shared";
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
  useBlogPosts,
  useCreateBlogPost,
  useUpdateBlogPost,
  useDeleteBlogPost,
  type BlogPost,
} from "@/lib/queries/content";
import { useBrandSettings } from "@/lib/hooks/use-brand-settings";
import { deriveWorkflowStatus } from "@/lib/queries/cms-foundation";

function parseTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((chunk) => chunk.trim())
        .filter(Boolean),
    ),
  );
}

function statusFor(item: BlogPost) {
  const status = deriveWorkflowStatus({
    status: item.status ?? null,
    isPublished: item.isPublished,
    publishedAt: item.publishedAt ?? null,
  });

  switch (status) {
    case "IN_REVIEW":
      return {
        label: "In Review",
        className: "bg-sky-50 text-sky-700",
      };
    case "SCHEDULED":
      return {
        label: "Scheduled",
        className: "bg-amber-50 text-amber-700",
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

function BlogModal({
  item,
  onClose,
  categoryOptions,
}: {
  item: BlogPost | null;
  onClose: () => void;
  categoryOptions: Array<{ id: string; label: string }>;
}) {
  const { data: brand } = useBrandSettings();
  const queryClient = useQueryClient();
  const defaultAuthor = brand?.siteName?.trim() ?? "";
  const [slugEdited, setSlugEdited] = useState(!!item);
  const [form, setForm] = useState({
    titleEn: item?.titleEn ?? "",
    slug: item?.slug ?? "",
    excerptEn: item?.excerptEn ?? "",
    contentEn: item?.contentEn ?? "",
    imageUrl: item?.imageUrl ?? "",
    imageAssetId: item?.primaryAssetId ?? "",
    category: normalizeBlogCategoryId(item?.category) || categoryOptions[0]?.id || "",
    categoryTermId: item?.categoryTermId ?? "",
    tags: item?.tags?.join(", ") ?? "",
    author: item?.author ?? defaultAuthor,
    status: deriveWorkflowStatus(item ?? {}),
    publishedAt: item?.publishedAt ? item.publishedAt.slice(0, 16) : "",
  });
  const [saving, setSaving] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  const create = useCreateBlogPost();
  const update = useUpdateBlogPost();

  useEffect(() => {
    if (!item && !form.author && defaultAuthor) {
      setForm((prev) => ({ ...prev, author: defaultAuthor }));
    }
  }, [defaultAuthor, form.author, item]);

  useEffect(() => {
    if (!item && !form.category && categoryOptions[0]?.id) {
      setForm((prev) => ({ ...prev, category: categoryOptions[0]!.id }));
    }
  }, [categoryOptions, form.category, item]);

  function set(field: string, value: string | boolean) {
    if (field === "titleEn" && !slugEdited) {
      const autoSlug = (value as string)
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      setForm((prev) => ({ ...prev, titleEn: value as string, slug: autoSlug }));
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titleEn.trim()) { toast.error("Title is required"); return; }
    if (!form.slug.trim()) { toast.error("Slug is required"); return; }
    const normalizedCategory = normalizeBlogCategoryId(form.category);
    if (!normalizedCategory) { toast.error("Category is required"); return; }
    if (form.status === "SCHEDULED" && !form.publishedAt) {
      toast.error("Publish At is required for scheduled posts");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        titleEn: form.titleEn,
        slug: form.slug,
        excerptEn: form.excerptEn,
        contentEn: form.contentEn,
        imageUrl: form.imageUrl.trim() || null,
        imageAssetId: form.imageAssetId || null,
        category: normalizedCategory,
        categoryTermId: form.categoryTermId || null,
        tags: parseTags(form.tags),
        author: form.author,
        isPublished: form.status === "PUBLISHED" || form.status === "SCHEDULED",
        publishedAt:
          form.status === "SCHEDULED" && form.publishedAt
            ? new Date(form.publishedAt).toISOString()
            : null,
      };
      const saved = item
        ? await update.mutateAsync({ id: item.id, data: payload })
        : await create.mutateAsync(payload as any);
      await updateCmsEntryStatus("blog", String(saved.id), {
        status: form.status,
        publishedAt:
          form.status === "SCHEDULED" && form.publishedAt
            ? new Date(form.publishedAt).toISOString()
            : null,
      });
      await queryClient.invalidateQueries({ queryKey: contentKeys.blog });
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
            {item ? "Edit" : "Add"} Blog Post
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
              value={form.titleEn}
              onChange={(e) => set("titleEn", e.target.value)}
              placeholder="e.g. How We Plan 500-Person Wedding Menus"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Slug *</label>
            <input
              value={form.slug}
              onChange={(e) => {
                setSlugEdited(true);
                set("slug", e.target.value);
              }}
              placeholder="how-we-plan-500-person-wedding-menus"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Excerpt</label>
            <textarea
              rows={3}
              value={form.excerptEn}
              onChange={(e) => set("excerptEn", e.target.value)}
              placeholder="Short summary shown in blog listing…"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Content (Markdown/HTML)</label>
            <textarea
              rows={6}
              value={form.contentEn}
              onChange={(e) => set("contentEn", e.target.value)}
              placeholder="Full article content…"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none resize-none"
            />
          </div>
          <AssetPickerField
            label="Featured Asset"
            valueAssetId={form.imageAssetId || null}
            valueImageUrl={form.imageUrl || null}
            onChange={(next) => {
              set("imageAssetId", next.assetId ?? "");
              set("imageUrl", next.imageUrl ?? "");
            }}
            helperText="Use the CMS asset library instead of pasting raw image URLs."
          />
          <TaxonomySelectField
            taxonomyKey="blog-category"
            label="Category"
            valueTermId={form.categoryTermId || null}
            fallbackSlug={form.category}
            onChange={(next) => {
              set("categoryTermId", next.termId ?? "");
              set("category", next.slug ?? "");
            }}
            helperText="Categories are stored as canonical taxonomy terms."
          />
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Tags</label>
            <input
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="corporate, wellness, events"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-text-tertiary">
              Separate tags with commas.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Author</label>
            <input
              value={form.author}
              onChange={(e) => set("author", e.target.value)}
              placeholder={defaultAuthor || "Site author name"}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <WorkflowStatusField
            status={form.status}
            publishedAt={form.publishedAt}
            onStatusChange={(status) => set("status", status)}
            onPublishedAtChange={(value) => set("publishedAt", value)}
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
            collection="blog"
            entryId={String(item.id)}
            isOpen={showRevisions}
            onClose={() => setShowRevisions(false)}
            onRestored={() => {
              queryClient.invalidateQueries({ queryKey: contentKeys.blog });
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BlogPage() {
  const { data: items = [], isLoading } = useBlogPosts();
  const del = useDeleteBlogPost();
  const [editing, setEditing] = useState<BlogPost | "new" | null>(null);
  const categoryOptions = useMemo(
    () => buildBlogCategoryOptions(items.map((item) => item.category)),
    [items],
  );

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
          <h1 className="text-xl font-semibold text-text-primary">Blog Posts</h1>
          <p className="text-sm text-text-secondary mt-0.5">Manage blog articles and news</p>
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Author</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">Publish At</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const status = statusFor(item);

                return (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-secondary/50">
                    <td className="px-4 py-3 text-text-primary font-medium">
                      <div>{item.titleEn}</div>
                      <div className="text-xs text-text-tertiary mt-0.5">{item.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] font-medium text-text-secondary capitalize">
                        {formatBlogCategoryLabel(item.category) || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{item.author ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {item.publishedAt ? new Date(item.publishedAt).toLocaleString("en-IN") : "Immediate"}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && (
        <BlogModal
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          categoryOptions={categoryOptions}
        />
      )}
    </div>
  );
}
