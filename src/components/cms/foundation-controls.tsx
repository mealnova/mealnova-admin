"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArchiveRestore,
  Copy,
  ExternalLink,
  History,
  ImagePlus,
  Loader2,
  Link2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { CmsAsset, CmsFoundationCollection, CmsWorkflowStatus } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import {
  useCmsEntryPreviewLinks,
  useCmsEntryPreviewRoutes,
  findCmsAsset,
  useCmsAssets,
  useCmsEntryRevision,
  useCmsEntryRevisions,
  useCmsEntryReviewEvents,
  useCmsTaxonomyTerms,
  useCreateCmsEntryPreviewLink,
  useRevokeCmsPreviewLink,
  useCreateExternalCmsAsset,
  useRestoreCmsEntryRevision,
  useUploadCmsAsset,
  workflowStatusLabel,
} from "@/lib/queries/cms-foundation";

const DEFAULT_WORKFLOW_OPTIONS: CmsWorkflowStatus[] = [
  "DRAFT",
  "IN_REVIEW",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
];

type WorkflowStatusFieldProps = {
  status: CmsWorkflowStatus;
  publishedAt: string;
  onStatusChange: (status: CmsWorkflowStatus) => void;
  onPublishedAtChange: (value: string) => void;
  allowScheduled?: boolean;
};

export function WorkflowStatusField({
  status,
  publishedAt,
  onStatusChange,
  onPublishedAtChange,
  allowScheduled = true,
}: WorkflowStatusFieldProps) {
  const { user } = useAuth();
  const options = useMemo(
    () => DEFAULT_WORKFLOW_OPTIONS.filter((value) => allowScheduled || value !== "SCHEDULED"),
    [allowScheduled],
  );
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-text-secondary">Workflow Status</label>
        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value as CmsWorkflowStatus)}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
        >
          {options.map((option) => (
            <option
              key={option}
              value={option}
              disabled={!isSuperAdmin && option !== status && !["DRAFT", "IN_REVIEW"].includes(option)}
            >
              {workflowStatusLabel(option)}
            </option>
          ))}
        </select>
        {!isSuperAdmin ? (
          <p className="mt-1 text-xs text-text-tertiary">
            Admins can save drafts and request review. Publishing, scheduling, and archiving require a super admin.
          </p>
        ) : null}
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-text-secondary">
          Publish At
        </label>
        <input
          type="datetime-local"
          value={publishedAt}
          onChange={(event) => onPublishedAtChange(event.target.value)}
          disabled={status !== "SCHEDULED"}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none disabled:bg-surface-secondary disabled:text-text-tertiary"
        />
      </div>
    </div>
  );
}

function previewBaseUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  const configured = process.env.NEXT_PUBLIC_WEB_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const url = new URL(window.location.origin);
  if (url.hostname === "localhost" && url.port === "3001") {
    url.port = "3000";
  }
  return url.toString().replace(/\/+$/, "");
}

type TaxonomySelectFieldProps = {
  taxonomyKey: string;
  label: string;
  valueTermId?: string | null;
  fallbackSlug?: string | null;
  onChange: (next: { termId: string | null; slug: string | null }) => void;
  helperText?: string;
};

export function TaxonomySelectField({
  taxonomyKey,
  label,
  valueTermId,
  fallbackSlug,
  onChange,
  helperText,
}: TaxonomySelectFieldProps) {
  const { data: terms = [], isLoading } = useCmsTaxonomyTerms(taxonomyKey);
  const selectedId = useMemo(() => {
    if (valueTermId) {
      return valueTermId;
    }

    const normalizedFallback = fallbackSlug?.trim();
    if (!normalizedFallback) {
      return "";
    }

    return terms.find((term) => term.slug === normalizedFallback)?.id ?? "";
  }, [fallbackSlug, terms, valueTermId]);

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-text-secondary">{label}</label>
      <select
        value={selectedId}
        onChange={(event) => {
          const nextId = event.target.value || null;
          const nextTerm = terms.find((term) => term.id === nextId) ?? null;
          onChange({
            termId: nextId,
            slug: nextTerm?.slug ?? null,
          });
        }}
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
      >
        <option value="">
          {isLoading ? "Loading categories..." : "Select a taxonomy term"}
        </option>
        {terms.map((term) => (
          <option key={term.id} value={term.id}>
            {term.label}
          </option>
        ))}
      </select>
      {helperText ? (
        <p className="mt-1 text-xs text-text-tertiary">{helperText}</p>
      ) : null}
    </div>
  );
}

type AssetPickerFieldProps = {
  label: string;
  valueAssetId?: string | null;
  valueImageUrl?: string | null;
  onChange: (next: { assetId: string | null; imageUrl: string | null }) => void;
  helperText?: string;
};

export function AssetPickerField({
  label,
  valueAssetId,
  valueImageUrl,
  onChange,
  helperText,
}: AssetPickerFieldProps) {
  const { data: assets = [] } = useCmsAssets(200);
  const selectedAsset = findCmsAsset(assets, {
    assetId: valueAssetId,
    imageUrl: valueImageUrl,
  });
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="rounded-xl border border-border bg-surface-secondary p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary">{label}</label>
            {helperText ? (
              <p className="mt-1 text-xs text-text-tertiary">{helperText}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            {selectedAsset ? "Change Asset" : "Choose Asset"}
          </button>
        </div>

        {selectedAsset ? (
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-border bg-white p-3">
            <div className="h-16 w-16 overflow-hidden rounded-lg bg-surface-secondary">
              <img
                src={selectedAsset.publicUrl}
                alt={selectedAsset.altText ?? selectedAsset.title ?? "CMS asset"}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-text-primary">
                {selectedAsset.title || selectedAsset.filename || "Selected asset"}
              </div>
              <div className="mt-1 truncate text-xs text-text-tertiary">{selectedAsset.publicUrl}</div>
              <div className="mt-2 text-[11px] text-text-tertiary">
                {selectedAsset.usages.length} linked usage(s)
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange({ assetId: null, imageUrl: null })}
              className="rounded-full p-1 text-text-tertiary hover:bg-surface-secondary hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : valueImageUrl ? (
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-border bg-white p-3">
            <div className="h-16 w-16 overflow-hidden rounded-lg bg-surface-secondary">
              <img
                src={valueImageUrl}
                alt="Existing CMS image"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-text-primary">Legacy image URL</div>
              <div className="mt-1 truncate text-xs text-text-tertiary">{valueImageUrl}</div>
              <div className="mt-2 text-[11px] text-text-tertiary">
                Select it again to register it as a CMS asset.
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange({ assetId: null, imageUrl: null })}
              className="rounded-full p-1 text-text-tertiary hover:bg-surface-secondary hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-white px-3 py-4 text-xs text-text-tertiary">
            No asset selected yet.
          </div>
        )}
      </div>

      {open ? (
        <AssetLibraryModal
          selectedAssetId={selectedAsset?.id ?? null}
          onClose={() => setOpen(false)}
          onSelect={(asset) => {
            onChange({
              assetId: asset.id,
              imageUrl: asset.publicUrl,
            });
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function AssetLibraryModal({
  selectedAssetId,
  onClose,
  onSelect,
}: {
  selectedAssetId?: string | null;
  onClose: () => void;
  onSelect: (asset: CmsAsset) => void;
}) {
  const { data: assets = [], isLoading } = useCmsAssets(200);
  const upload = useUploadCmsAsset(200);
  const createExternal = useCreateExternalCmsAsset(200);
  const [externalUrl, setExternalUrl] = useState("");
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function handleUpload() {
    if (!selectedFile) {
      toast.error("Choose an image file first");
      return;
    }

    try {
      const asset = await upload.mutateAsync({
        file: selectedFile,
        title: title.trim() || null,
        altText: altText.trim() || null,
      });
      toast.success("Asset uploaded");
      onSelect(asset);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    }
  }

  async function handleExternalCreate() {
    if (!externalUrl.trim()) {
      toast.error("Asset URL is required");
      return;
    }

    try {
      const asset = await createExternal.mutateAsync({
        publicUrl: externalUrl.trim(),
        title: title.trim() || null,
        altText: altText.trim() || null,
      });
      toast.success("Asset linked");
      onSelect(asset);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create asset");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="text-base font-semibold text-text-primary">Asset Library</div>
            <div className="mt-0.5 text-sm text-text-secondary">
              Select an existing asset, upload a new file, or register an external image URL.
            </div>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 overflow-y-auto p-5 lg:grid-cols-[1.4fr,0.9fr]">
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              Existing Assets
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {isLoading ? (
                <div className="rounded-xl border border-border bg-surface-secondary px-4 py-6 text-sm text-text-tertiary">
                  Loading assets...
                </div>
              ) : assets.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface-secondary px-4 py-6 text-sm text-text-tertiary">
                  No assets yet. Upload one or add an external URL.
                </div>
              ) : (
                assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => onSelect(asset)}
                    className={`overflow-hidden rounded-2xl border text-left transition ${
                      asset.id === selectedAssetId
                        ? "border-brand-500 bg-brand-50"
                        : "border-border bg-white hover:border-brand-300"
                    }`}
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-surface-secondary">
                      <img
                        src={asset.publicUrl}
                        alt={asset.altText ?? asset.title ?? "CMS asset"}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <div className="truncate text-sm font-semibold text-text-primary">
                        {asset.title || asset.filename || "Untitled asset"}
                      </div>
                      <div className="mt-1 truncate text-xs text-text-tertiary">{asset.publicUrl}</div>
                      <div className="mt-2 text-[11px] text-text-tertiary">
                        {asset.source} · {asset.usages.length} usage(s)
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-surface-secondary p-4">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                <UploadCloud className="h-3.5 w-3.5" />
                Upload Image
              </div>
              <div className="mt-3 space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-text-secondary"
                />
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Title"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                />
                <input
                  value={altText}
                  onChange={(event) => setAltText(event.target.value)}
                  placeholder="Alt text"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={upload.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                >
                  {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  Upload and Select
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface-secondary p-4">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                <Link2 className="h-3.5 w-3.5" />
                External Asset
              </div>
              <div className="mt-3 space-y-3">
                <input
                  value={externalUrl}
                  onChange={(event) => setExternalUrl(event.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleExternalCreate}
                  disabled={createExternal.isPending}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary disabled:opacity-60"
                >
                  {createExternal.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  Link and Select
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type RevisionHistoryPanelProps = {
  collection: CmsFoundationCollection;
  entryId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRestored?: () => void;
};

export function RevisionHistoryPanel({
  collection,
  entryId,
  isOpen,
  onClose,
  onRestored,
}: RevisionHistoryPanelProps) {
  const { data: revisions = [], isLoading } = useCmsEntryRevisions(collection, entryId);
  const { data: reviewEvents = [], isLoading: reviewLoading } = useCmsEntryReviewEvents(collection, entryId);
  const [previewLocale, setPreviewLocale] = useState("en");
  const { data: previewRoutes = [], isLoading: previewRoutesLoading } = useCmsEntryPreviewRoutes(
    collection,
    entryId,
    previewLocale,
  );
  const { data: previewLinks = [], isLoading: previewLinksLoading } = useCmsEntryPreviewLinks(
    collection,
    entryId,
  );
  const createPreviewLink = useCreateCmsEntryPreviewLink(collection, entryId);
  const revokePreviewLink = useRevokeCmsPreviewLink(collection, entryId);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [selectedPreviewRoutePath, setSelectedPreviewRoutePath] = useState("");
  const [freshPreviewUrl, setFreshPreviewUrl] = useState<string | null>(null);
  const restore = useRestoreCmsEntryRevision(collection, entryId);
  const selectedRevision = selectedRevisionId ?? revisions[0]?.id ?? null;
  const revisionQuery = useCmsEntryRevision(collection, entryId, selectedRevision);

  useEffect(() => {
    if (!selectedPreviewRoutePath && previewRoutes[0]?.routePath) {
      setSelectedPreviewRoutePath(previewRoutes[0].routePath);
    }
  }, [previewRoutes, selectedPreviewRoutePath]);

  if (!isOpen) {
    return null;
  }

  async function handleRestore() {
    if (!selectedRevision) {
      return;
    }
    if (!window.confirm("Restore this revision? Current content will be replaced.")) {
      return;
    }

    try {
      await restore.mutateAsync(selectedRevision);
      toast.success("Revision restored");
      onRestored?.();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to restore revision");
    }
  }

  async function handleCreatePreviewLink() {
    if (!selectedPreviewRoutePath) {
      toast.error("Select a route before generating a preview link");
      return;
    }

    try {
      const created = await createPreviewLink.mutateAsync({
        routePath: selectedPreviewRoutePath,
        locale: previewLocale,
      });
      const base = previewBaseUrl();
      const nextUrl = created.token
        ? `${base}/api/preview?token=${encodeURIComponent(created.token)}`
        : null;
      setFreshPreviewUrl(nextUrl);
      if (nextUrl && typeof navigator !== "undefined") {
        await navigator.clipboard.writeText(nextUrl);
        toast.success("Preview link created and copied");
      } else {
        toast.success("Preview link created");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create preview link");
    }
  }

  async function handleCopyPreviewLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Preview link copied");
    } catch {
      toast.error("Failed to copy preview link");
    }
  }

  async function handleRevokePreviewLink(previewLinkId: string) {
    if (!window.confirm("Revoke this preview link? Anyone using it will lose access immediately.")) {
      return;
    }

    try {
      await revokePreviewLink.mutateAsync(previewLinkId);
      toast.success("Preview link revoked");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke preview link");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-surface shadow-xl">
        <div className="flex w-full flex-col lg:w-[320px] lg:border-r lg:border-border">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <div className="inline-flex items-center gap-2 text-base font-semibold text-text-primary">
                <History className="h-4 w-4" />
                Entry History
              </div>
              <div className="mt-0.5 text-sm text-text-secondary">
                {entryId
                  ? "Preview, review, and restore this entry from one place."
                  : "Save the entry first to create previews and revisions."}
              </div>
            </div>
            <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="overflow-y-auto p-4 space-y-4">
            <div className="rounded-2xl border border-border bg-surface-secondary p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                Preview Links
              </div>
              {entryId ? (
                <div className="mt-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-secondary">Locale</label>
                      <select
                        value={previewLocale}
                        onChange={(event) => {
                          setPreviewLocale(event.target.value);
                          setSelectedPreviewRoutePath("");
                        }}
                        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                      >
                        <option value="en">English</option>
                        <option value="hi">Hindi</option>
                        <option value="mr">Marathi</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-secondary">Route</label>
                      <select
                        value={selectedPreviewRoutePath}
                        onChange={(event) => setSelectedPreviewRoutePath(event.target.value)}
                        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                      >
                        <option value="">
                          {previewRoutesLoading ? "Loading routes..." : "Select a route"}
                        </option>
                        {previewRoutes.map((route) => (
                          <option key={route.routePath} value={route.routePath}>
                            {route.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreatePreviewLink}
                    disabled={createPreviewLink.isPending || previewRoutesLoading || previewRoutes.length === 0}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                  >
                    {createPreviewLink.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                    Generate Preview Link
                  </button>

                  {freshPreviewUrl ? (
                    <div className="rounded-xl border border-brand-200 bg-white p-3">
                      <div className="text-xs font-semibold text-brand-700">Fresh Preview Link</div>
                      <div className="mt-1 break-all text-xs text-text-secondary">{freshPreviewUrl}</div>
                      <button
                        type="button"
                        onClick={() => handleCopyPreviewLink(freshPreviewUrl)}
                        className="mt-3 inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy Link
                      </button>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    {previewLinksLoading ? (
                      <div className="rounded-xl border border-border bg-white px-3 py-4 text-sm text-text-tertiary">
                        Loading preview links...
                      </div>
                    ) : previewLinks.length === 0 ? (
                      <div className="rounded-xl border border-border bg-white px-3 py-4 text-sm text-text-tertiary">
                        No preview links created yet.
                      </div>
                    ) : (
                      previewLinks.map((link) => (
                        <div key={link.id} className="rounded-xl border border-border bg-white p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-text-primary">
                                {link.routePath}
                              </div>
                              <div className="mt-1 text-[11px] text-text-tertiary">
                                Expires {new Date(link.expiresAt).toLocaleString("en-IN")}
                              </div>
                            </div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                link.isActive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {link.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRevokePreviewLink(link.id)}
                              disabled={!link.isActive || revokePreviewLink.isPending}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary disabled:opacity-60"
                            >
                              <X className="h-3.5 w-3.5" />
                              Revoke
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-border bg-white px-3 py-4 text-sm text-text-tertiary">
                  Save the entry first to generate a preview link.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-surface-secondary p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                Review Activity
              </div>
              <div className="mt-3 space-y-2">
                {reviewLoading ? (
                  <div className="rounded-xl border border-border bg-white px-3 py-4 text-sm text-text-tertiary">
                    Loading review history...
                  </div>
                ) : reviewEvents.length === 0 ? (
                  <div className="rounded-xl border border-border bg-white px-3 py-4 text-sm text-text-tertiary">
                    No review activity recorded yet.
                  </div>
                ) : (
                  reviewEvents.map((event) => (
                    <div key={event.id} className="rounded-xl border border-border bg-white p-3">
                      <div className="text-sm font-semibold text-text-primary">
                        {event.actorName || event.actorUser?.name || "Unknown user"}
                      </div>
                      <div className="mt-1 text-xs text-text-tertiary">
                        {(event.fromStatus ? `${workflowStatusLabel(event.fromStatus)} -> ` : "") +
                          workflowStatusLabel(event.toStatus)}
                      </div>
                      {event.note ? (
                        <div className="mt-2 text-xs text-text-secondary">{event.note}</div>
                      ) : null}
                      <div className="mt-2 text-[11px] text-text-tertiary">
                        {new Date(event.createdAt).toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface-secondary p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                Revisions
              </div>
              <div className="mt-3">
                {isLoading ? (
                  <div className="rounded-xl border border-border bg-white px-4 py-6 text-sm text-text-tertiary">
                    Loading revisions...
                  </div>
                ) : revisions.length === 0 ? (
                  <div className="rounded-xl border border-border bg-white px-4 py-6 text-sm text-text-tertiary">
                    No revisions recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {revisions.map((revision) => (
                      <button
                        key={revision.id}
                        type="button"
                        onClick={() => setSelectedRevisionId(revision.id)}
                        className={`w-full rounded-xl border px-3 py-3 text-left ${
                          revision.id === selectedRevision
                            ? "border-brand-500 bg-brand-50"
                            : "border-border bg-white hover:border-brand-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-text-primary">
                            Revision #{revision.revisionNumber}
                          </div>
                          <div className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                            {workflowStatusLabel(revision.status)}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-text-tertiary">
                          {new Date(revision.createdAt).toLocaleString("en-IN")}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-border px-5 py-4">
            <div className="text-base font-semibold text-text-primary">Revision Snapshot</div>
            <div className="mt-0.5 text-sm text-text-secondary">
              Inspect the stored snapshot before restoring it.
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {!selectedRevision ? (
              <div className="rounded-xl border border-border bg-surface-secondary px-4 py-6 text-sm text-text-tertiary">
                Select a revision to inspect it.
              </div>
            ) : revisionQuery.isLoading ? (
              <div className="rounded-xl border border-border bg-surface-secondary px-4 py-6 text-sm text-text-tertiary">
                Loading revision snapshot...
              </div>
            ) : revisionQuery.data ? (
              <>
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                    {workflowStatusLabel(revisionQuery.data.status)}
                  </span>
                  <span className="rounded-full bg-surface-secondary px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
                    Revision #{revisionQuery.data.revisionNumber}
                  </span>
                </div>
                <pre className="overflow-x-auto rounded-2xl border border-border bg-surface-secondary p-4 text-xs leading-6 text-text-primary">
                  {JSON.stringify(revisionQuery.data.snapshot, null, 2)}
                </pre>
              </>
            ) : (
              <div className="rounded-xl border border-border bg-surface-secondary px-4 py-6 text-sm text-text-tertiary">
                Unable to load the selected revision.
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleRestore}
              disabled={!selectedRevision || restore.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {restore.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArchiveRestore className="h-4 w-4" />
              )}
              Restore Revision
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
