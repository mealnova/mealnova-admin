"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Database,
  History,
  Loader2,
  RefreshCcw,
  Save,
  ShieldAlert,
  Workflow,
} from "lucide-react";
import {
  getCmsPlatformSummary,
  getCmsPlatformRollout,
  syncCmsPlatformCollection,
  updateCmsPlatformRollout,
  type CmsPlatformCollectionSummary,
  type CmsPlatformRolloutState,
  type CmsReadSource,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CollectionKey = keyof CmsPlatformRolloutState["collections"];
const COLLECTION_COPY: Record<
  CollectionKey,
  { label: string; description: string; supportsManualWriteToggles: boolean }
> = {
  pages: {
    label: "Pages",
    description: "Route-driven marketing and legal pages served by the content module.",
    supportsManualWriteToggles: true,
  },
  blog: {
    label: "Blog",
    description: "Editorial posts served by the CMS module and public blog routes.",
    supportsManualWriteToggles: true,
  },
  faqs: {
    label: "FAQs",
    description: "Common customer questions and answers.",
    supportsManualWriteToggles: false,
  },
  testimonials: {
    label: "Testimonials",
    description: "Social proof and customer quotes.",
    supportsManualWriteToggles: false,
  },
  gallery: {
    label: "Gallery",
    description: "Media items used across the website.",
    supportsManualWriteToggles: false,
  },
  careers: {
    label: "Careers",
    description: "Published job openings and hiring metadata.",
    supportsManualWriteToggles: false,
  },
  clientLogos: {
    label: "Client Logos",
    description: "Trust-strip client and partner logos.",
    supportsManualWriteToggles: false,
  },
  services: {
    label: "Services",
    description: "Service cards and CTA-driven offering content.",
    supportsManualWriteToggles: false,
  },
  eventTypes: {
    label: "Event Types",
    description: "Event format cards and descriptive content.",
    supportsManualWriteToggles: false,
  },
  cuisines: {
    label: "Cuisines",
    description: "Cuisine options and live-counter metadata.",
    supportsManualWriteToggles: false,
  },
  pricing: {
    label: "Pricing",
    description: "Pricing tiers and CTA metadata.",
    supportsManualWriteToggles: false,
  },
};

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface-secondary p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-tertiary">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 rounded-full transition-colors",
          checked ? "bg-brand-500" : "bg-surface-tertiary",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked ? "left-6" : "left-1",
          )}
        />
      </button>
    </div>
  );
}

function ReadSourceSelect({
  value,
  onChange,
  effective,
  overridden,
}: {
  value: CmsReadSource;
  onChange: (value: CmsReadSource) => void;
  effective: CmsReadSource;
  overridden: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-secondary p-4">
      <div className="mb-3 space-y-1">
        <p className="text-sm font-medium text-text-primary">Read Source</p>
        <p className="text-xs text-text-tertiary">
          Choose which repository backs live reads for this collection.
        </p>
      </div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as CmsReadSource)}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
      >
        <option value="legacy">Legacy</option>
        <option value="platform">Platform</option>
      </select>
      <p className="mt-3 text-xs text-text-tertiary">
        Effective read path: <span className="font-medium text-text-secondary">{effective}</span>
        {overridden ? " via global force-legacy override." : "."}
      </p>
    </div>
  );
}

function HealthPill({ ready }: { ready: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        ready
          ? "bg-emerald-100 text-emerald-700"
          : "bg-amber-100 text-amber-800",
      )}
    >
      {ready ? <Workflow className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {ready ? "Ready for platform reads" : "Not ready for platform reads"}
    </span>
  );
}

function SummaryMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-secondary p-4">
      <div className="mb-2 flex items-center gap-2 text-xs text-text-tertiary">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-xl font-semibold text-text-primary">{value}</div>
    </div>
  );
}

export default function CmsPlatformSettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["cms-platform-rollout"],
    queryFn: getCmsPlatformRollout,
  });
  const {
    data: summary,
    isLoading: isSummaryLoading,
  } = useQuery({
    queryKey: ["cms-platform-summary"],
    queryFn: getCmsPlatformSummary,
  });
  const [form, setForm] = useState<CmsPlatformRolloutState | null>(null);

  useEffect(() => {
    if (data) {
      setForm(data);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: updateCmsPlatformRollout,
    onSuccess: (nextState) => {
      queryClient.setQueryData(["cms-platform-rollout"], nextState);
      setForm(nextState);
      toast.success("CMS platform rollout settings saved");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to save rollout settings");
    },
  });

  const syncMutation = useMutation({
    mutationFn: syncCmsPlatformCollection,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["cms-platform-summary"] });
      const label = COLLECTION_COPY[result.collection as CollectionKey].label;
      toast.success(
        `${label} synced into platform (${result.syncedCount} rows)`,
      );
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to sync CMS platform collection");
    },
  });

  const isDirty = useMemo(() => {
    if (!data || !form) return false;
    return JSON.stringify(form) !== JSON.stringify(data);
  }, [data, form]);

  const setGlobalFlag = (key: "forceLegacy", value: boolean) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const setCollectionFlag = <K extends keyof CmsPlatformRolloutState["collections"][CollectionKey]>(
    collection: CollectionKey,
    key: K,
    value: CmsPlatformRolloutState["collections"][CollectionKey][K],
  ) => {
    setForm((current) => {
      if (!current) return current;

      return {
        ...current,
        collections: {
          ...current.collections,
          [collection]: {
            ...current.collections[collection],
            [key]: value,
          },
        },
      };
    });
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-sm text-danger-700">
        Failed to load CMS platform rollout settings.
      </div>
    );
  }

  if (isLoading || !form) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-text-tertiary">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading CMS platform controls…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-brand-50 p-2 text-brand-700">
            <Workflow className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-text-primary">CMS Platform Rollout</h1>
            <p className="max-w-3xl text-sm text-text-secondary">
              Operate the CMS cutover without editing raw settings keys. Every current
              CMS collection now persists entries, localized payloads, and revision snapshots
              in platform storage, with per-collection rollback and reconciliation controls.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-sm">
            These flags affect live content reads and future write routing. Keep
            `force legacy` enabled in production until platform tables, backfills, and
            shadow-read comparisons are clean.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Toggle
            checked={form.forceLegacy}
            onChange={(next) => setGlobalFlag("forceLegacy", next)}
            label="Force Legacy Reads"
            description="Global safety override. When enabled, all collections read from legacy storage regardless of collection read-source flags."
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {(Object.keys(form.collections) as CollectionKey[]).map((collection) => {
          const flags = form.collections[collection];
          const copy = COLLECTION_COPY[collection];
          const effectiveReadSource = form.forceLegacy ? "legacy" : flags.readSource;
          const collectionSummary: CmsPlatformCollectionSummary | undefined = summary?.[collection];
          const syncPending =
            syncMutation.isPending && syncMutation.variables === collection;

          return (
            <article key={collection} className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-text-primary">
                    {copy.label}
                  </h2>
                  <p className="text-sm text-text-tertiary">
                    {copy.description}
                  </p>
                  {collectionSummary && (
                    <HealthPill ready={collectionSummary.readyForPlatformRead} />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => syncMutation.mutate(collection)}
                  disabled={syncPending}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {syncPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
                  {syncPending ? "Syncing…" : "Backfill / Resync"}
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <SummaryMetric
                    label="Legacy Rows"
                    value={collectionSummary?.legacyCount ?? 0}
                    icon={Database}
                  />
                  <SummaryMetric
                    label="Platform Entries"
                    value={collectionSummary?.platformCount ?? 0}
                    icon={Workflow}
                  />
                  <SummaryMetric
                    label="Revisions"
                    value={collectionSummary?.revisionCount ?? 0}
                    icon={History}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <SummaryMetric
                    label="Missing"
                    value={collectionSummary?.missingCount ?? 0}
                    icon={AlertTriangle}
                  />
                  <SummaryMetric
                    label="Stale"
                    value={collectionSummary?.staleCount ?? 0}
                    icon={RefreshCcw}
                  />
                  <SummaryMetric
                    label="Orphan"
                    value={collectionSummary?.orphanCount ?? 0}
                    icon={Database}
                  />
                </div>
                {isSummaryLoading && (
                  <p className="text-xs text-text-tertiary">Loading platform collection counts…</p>
                )}
                <ReadSourceSelect
                  value={flags.readSource}
                  onChange={(next) => setCollectionFlag(collection, "readSource", next)}
                  effective={effectiveReadSource}
                  overridden={form.forceLegacy}
                />
                <Toggle
                  checked={flags.shadowRead}
                  onChange={(next) => setCollectionFlag(collection, "shadowRead", next)}
                  label="Shadow Read"
                  description="Fetch from the non-primary repository in the background and log mismatches for safe cutover validation."
                />
                {copy.supportsManualWriteToggles ? (
                  <>
                    <Toggle
                      checked={flags.dualWrite}
                      onChange={(next) => setCollectionFlag(collection, "dualWrite", next)}
                      label="Dual Write"
                      description="Write through the primary repository and mirror the same change into the secondary repository for parity checks."
                    />
                    <Toggle
                      checked={flags.legacyProjectionWrite}
                      onChange={(next) =>
                        setCollectionFlag(collection, "legacyProjectionWrite", next)
                      }
                      label="Legacy Projection Write"
                      description="When platform is primary, keep legacy tables projected in sync for compatibility during the cutover window."
                    />
                  </>
                ) : (
                  <div className="rounded-xl border border-border bg-surface-secondary p-4">
                    <p className="text-sm font-medium text-text-primary">Compatibility writes</p>
                    <p className="mt-1 text-xs text-text-tertiary">
                      This collection now supports rollout-aware reads and shadow comparison.
                      Legacy projections remain managed automatically so rollback reads stay viable
                      during the migration window.
                    </p>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <div className="flex items-center justify-end gap-3 rounded-2xl border border-border bg-surface p-4">
        <button
          type="button"
          onClick={() => data && setForm(data)}
          disabled={!isDirty || mutation.isPending}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => form && mutation.mutate(form)}
          disabled={!isDirty || mutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mutation.isPending ? "Saving…" : "Save Rollout Settings"}
        </button>
      </div>
    </div>
  );
}
