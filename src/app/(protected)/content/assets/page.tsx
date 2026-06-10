"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, ImagePlus, Pencil, Search, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import {
  useCmsAssets,
  useCreateExternalCmsAsset,
  useUpdateCmsAsset,
  useUploadCmsAsset,
} from "@/lib/queries/cms-foundation";

const COLLECTION_ROUTES: Record<string, string> = {
  PAGE: "/content/pages",
  BLOG: "/content/blog",
  FAQ: "/content/faqs",
  TESTIMONIAL: "/content/testimonials",
  GALLERY_ITEM: "/content/gallery",
  CAREER_OPENING: "/content/careers",
  CLIENT_LOGO: "/content/client-logos",
  SERVICE_OFFERING: "/content/services",
  EVENT_TYPE: "/content/event-types",
  CUISINE_OPTION: "/content/cuisines",
  PRICING_TIER: "/content/pricing",
};

function AssetEditorModal({
  asset,
  onClose,
}: {
  asset: {
    id: string;
    publicUrl: string;
    title?: string | null;
    altText?: string | null;
    source: "UPLOAD" | "EXTERNAL";
  };
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    title: asset.title ?? "",
    altText: asset.altText ?? "",
    publicUrl: asset.publicUrl,
  });
  const [saving, setSaving] = useState(false);
  const update = useUpdateCmsAsset({ limit: 500 });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await update.mutateAsync({
        id: asset.id,
        body: {
          title: form.title.trim() || null,
          altText: form.altText.trim() || null,
          ...(asset.source === "EXTERNAL" ? { publicUrl: form.publicUrl.trim() } : {}),
        },
      });
      toast.success("Asset updated");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update asset");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-text-primary">Edit Asset</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Title</label>
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Alt Text</label>
            <input
              value={form.altText}
              onChange={(event) => setForm((prev) => ({ ...prev, altText: event.target.value }))}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Public URL</label>
            <input
              value={form.publicUrl}
              disabled={asset.source === "UPLOAD"}
              onChange={(event) => setForm((prev) => ({ ...prev, publicUrl: event.target.value }))}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none disabled:bg-surface-secondary disabled:text-text-tertiary"
            />
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
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateAssetModal({ onClose }: { onClose: () => void }) {
  const upload = useUploadCmsAsset({ limit: 500 });
  const createExternal = useCreateExternalCmsAsset({ limit: 500 });
  const [mode, setMode] = useState<"upload" | "external">("upload");
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      if (mode === "upload") {
        if (!file) {
          toast.error("Choose an image file first");
          return;
        }
        await upload.mutateAsync({
          file,
          title: title.trim() || null,
          altText: altText.trim() || null,
        });
      } else {
        if (!publicUrl.trim()) {
          toast.error("External URL is required");
          return;
        }
        await createExternal.mutateAsync({
          publicUrl: publicUrl.trim(),
          title: title.trim() || null,
          altText: altText.trim() || null,
        });
      }
      toast.success(mode === "upload" ? "Asset uploaded" : "Asset linked");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create asset");
    }
  }

  const saving = upload.isPending || createExternal.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-text-primary">Add Asset</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 p-5">
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface-secondary p-1">
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                mode === "upload" ? "bg-white text-text-primary shadow-sm" : "text-text-secondary"
              }`}
            >
              Upload File
            </button>
            <button
              type="button"
              onClick={() => setMode("external")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                mode === "external" ? "bg-white text-text-primary shadow-sm" : "text-text-secondary"
              }`}
            >
              External URL
            </button>
          </div>
          {mode === "upload" ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Image File</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-text-secondary"
              />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">External URL</label>
              <input
                value={publicUrl}
                onChange={(event) => setPublicUrl(event.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Alt Text</label>
            <input
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
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
              {saving ? "Saving..." : mode === "upload" ? "Upload Asset" : "Link Asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ContentAssetsPage() {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<"ALL" | "UPLOAD" | "EXTERNAL">("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { data: assets = [], isLoading } = useCmsAssets({
    limit: 500,
    q: search,
    ...(source === "ALL" ? {} : { source }),
  });

  const editingAsset = assets.find((asset) => asset.id === editingId) ?? null;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Assets</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Manage uploaded and external CMS images, metadata, and content usage.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <ImagePlus className="h-4 w-4" />
          Add Asset
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr,180px]">
        <label className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2">
          <Search className="h-4 w-4 text-text-tertiary" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title, URL, alt text, or filename"
            className="w-full bg-transparent text-sm text-text-primary placeholder-text-tertiary focus:outline-none"
          />
        </label>
        <select
          value={source}
          onChange={(event) => setSource(event.target.value as typeof source)}
          className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
        >
          <option value="ALL">All Sources</option>
          <option value="UPLOAD">Uploads</option>
          <option value="EXTERNAL">External URLs</option>
        </select>
      </div>

      {isLoading ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-2xl bg-surface-secondary" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border bg-white px-6 py-12 text-center text-sm text-text-tertiary">
          No assets matched the current filters.
        </div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <div key={asset.id} className="overflow-hidden rounded-2xl border border-border bg-white">
              <div className="aspect-[4/3] overflow-hidden bg-surface-secondary">
                <img
                  src={asset.publicUrl}
                  alt={asset.altText ?? asset.title ?? "CMS asset"}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-text-primary">
                      {asset.title || asset.filename || "Untitled asset"}
                    </div>
                    <div className="mt-1 truncate text-xs text-text-tertiary">{asset.publicUrl}</div>
                  </div>
                  <button
                    onClick={() => setEditingId(asset.id)}
                    className="rounded-lg border border-border bg-white p-2 text-text-tertiary hover:text-text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-full bg-surface-secondary px-2.5 py-1 font-semibold text-text-secondary">
                    {asset.source === "UPLOAD" ? "Uploaded" : "External"}
                  </span>
                  <span className="rounded-full bg-surface-secondary px-2.5 py-1 font-semibold text-text-secondary">
                    {asset.usages.length} usage(s)
                  </span>
                </div>

                {asset.altText ? (
                  <div className="text-xs text-text-secondary">Alt: {asset.altText}</div>
                ) : null}

                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                    Linked Content
                  </div>
                  {asset.usages.length === 0 ? (
                    <div className="text-xs text-text-tertiary">No linked CMS entries yet.</div>
                  ) : (
                    <div className="space-y-1">
                      {asset.usages.slice(0, 5).map((usage) => {
                        const href = COLLECTION_ROUTES[usage.entry.collection] ?? "/settings/cms-platform";
                        return (
                          <Link
                            key={usage.id}
                            href={href}
                            className="flex items-center justify-between rounded-lg bg-surface-secondary px-3 py-2 text-xs text-text-secondary hover:text-text-primary"
                          >
                            <span className="truncate">
                              {usage.entry.collection} · {usage.entry.slug}
                            </span>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating ? <CreateAssetModal onClose={() => setCreating(false)} /> : null}
      {editingAsset ? (
        <AssetEditorModal asset={editingAsset} onClose={() => setEditingId(null)} />
      ) : null}
    </div>
  );
}
