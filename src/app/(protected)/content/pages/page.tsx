"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Edit,
  FileCode2,
  History,
  Layers3,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { updateCmsEntryStatus, type CmsWorkflowStatus } from "@/lib/api";
import {
  RevisionHistoryPanel,
  WorkflowStatusField,
} from "@/components/cms/foundation-controls";
import { StructuredPageBuilder } from "@/components/cms/structured-page-builder";
import {
  contentKeys,
  useCreatePage,
  useDeletePage,
  usePages,
  useUpdatePage,
  type ContentPage,
  type ContentPageInput,
} from "@/lib/queries/content";
import {
  PAGE_TEMPLATE_OPTIONS,
  createStructuredPageStarter,
  flattenStructuredDocument,
  prettyPrintPageContent,
  suggestPageTemplate,
  summarizePageContent,
  wrapLongFormAsStructuredDocument,
  type PageContentMode,
  type PageLocale,
  type PageTemplateKey,
} from "@/lib/page-content-editor";
import { deriveWorkflowStatus } from "@/lib/queries/cms-foundation";

interface PageFormState {
  slug: string;
  titleEn: string;
  titleHi: string;
  titleMr: string;
  contentEn: string;
  contentHi: string;
  contentMr: string;
  metaTitle: string;
  metaDescription: string;
  status: CmsWorkflowStatus;
  publishedAt: string;
  contentMode: PageContentMode;
  pageTemplate: PageTemplateKey;
}

const LOCALES: Array<{
  key: PageLocale;
  label: string;
  hint: string;
}> = [
  { key: "en", label: "English", hint: "Canonical source for the route." },
  { key: "hi", label: "Hindi", hint: "Optional localized content." },
  { key: "mr", label: "Marathi", hint: "Optional localized content." },
];

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function emptyForm(): PageFormState {
  return {
    slug: "",
    titleEn: "",
    titleHi: "",
    titleMr: "",
    contentEn: "",
    contentHi: "",
    contentMr: "",
    metaTitle: "",
    metaDescription: "",
    status: "DRAFT",
    publishedAt: "",
    contentMode: "structured-json",
    pageTemplate: "landing",
  };
}

function localizedTitle(form: PageFormState, locale: PageLocale) {
  if (locale === "hi") return form.titleHi.trim() || form.titleEn.trim() || form.slug || "Page";
  if (locale === "mr") return form.titleMr.trim() || form.titleEn.trim() || form.slug || "Page";
  return form.titleEn.trim() || form.slug || "Page";
}

function pageToForm(item: ContentPage | null): PageFormState {
  if (!item) return emptyForm();

  const summary = summarizePageContent(item.contentEn);
  const pageTemplate =
    summary.pageType ?? suggestPageTemplate(item.slug);
  const contentMode = summary.mode;

  const convertField = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (contentMode === "structured-json") {
      const pretty = prettyPrintPageContent(trimmed);
      return pretty.mode === "structured-json" ? pretty.content : trimmed;
    }
    return trimmed;
  };

  return {
    slug: item.slug,
    titleEn: item.titleEn,
    titleHi: item.titleHi ?? "",
    titleMr: item.titleMr ?? "",
    contentEn: convertField(item.contentEn),
    contentHi: convertField(item.contentHi ?? ""),
    contentMr: convertField(item.contentMr ?? ""),
    metaTitle: item.metaTitle ?? "",
    metaDescription: item.metaDescription ?? "",
    status: deriveWorkflowStatus(item),
    publishedAt: item.publishedAt ? item.publishedAt.slice(0, 16) : "",
    contentMode,
    pageTemplate,
  };
}

function pageStatusBadge(status: CmsWorkflowStatus) {
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

function pageTemplateLabel(value: PageTemplateKey) {
  return PAGE_TEMPLATE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function pageTemplateDescription(value: PageTemplateKey) {
  return PAGE_TEMPLATE_OPTIONS.find((option) => option.value === value)?.description ?? "";
}

function localeSummary(content: string) {
  return summarizePageContent(content);
}

function LocaleEditor({
  locale,
  label,
  hint,
  value,
  contentMode,
  pageTemplate,
  title,
  summaryText,
  metaTitle,
  metaDescription,
  onChange,
  onConvertToStructured,
  onFlatten,
}: {
  locale: PageLocale;
  label: string;
  hint: string;
  value: string;
  contentMode: PageContentMode;
  pageTemplate: PageTemplateKey;
  title: string;
  summaryText?: string;
  metaTitle?: string;
  metaDescription?: string;
  onChange: (value: string) => void;
  onConvertToStructured: () => void;
  onFlatten: () => void;
}) {
  const summary = localeSummary(value);

  return (
    <div className="rounded-2xl border border-border bg-surface-secondary p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-text-primary">{label}</div>
          <div className="mt-1 text-xs text-text-tertiary">{hint}</div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {contentMode === "structured-json" ? (
            <button
              type="button"
              onClick={onFlatten}
              className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-text-secondary hover:text-text-primary"
            >
              Flatten
            </button>
          ) : (
            <button
              type="button"
              onClick={onConvertToStructured}
              className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-text-secondary hover:text-text-primary"
            >
              Wrap as JSON
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        <span
          className={`rounded-full px-2.5 py-1 font-semibold ${
            summary.mode === "structured-json"
              ? "bg-brand-50 text-brand-700"
              : "bg-surface-secondary text-text-tertiary"
          }`}
        >
          {summary.mode === "structured-json" ? "Structured JSON" : "Long-form text"}
        </span>
        {summary.mode === "structured-json" ? (
          <>
            <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-text-secondary">
              {summary.valid ? "Valid" : "Invalid"}
            </span>
            {summary.pageType ? (
              <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-text-secondary">
                {pageTemplateLabel(summary.pageType)}
              </span>
            ) : null}
            {summary.sectionCount !== undefined ? (
              <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-text-secondary">
                {summary.sectionCount} sections
              </span>
            ) : null}
          </>
        ) : (
          <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-text-secondary">
            Plain text compatibility mode
          </span>
        )}
      </div>

      {summary.mode === "structured-json" && !summary.valid ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{summary.error || "Invalid JSON content."}</span>
        </div>
      ) : null}

      {contentMode === "structured-json" && summary.valid ? (
        <div className="mt-3">
          <StructuredPageBuilder
            locale={locale}
            value={value}
            pageTemplate={pageTemplate}
            title={title}
            summary={summaryText}
            metaTitle={metaTitle}
            metaDescription={metaDescription}
            onChange={onChange}
          />
        </div>
      ) : (
        <textarea
          rows={16}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-3 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm leading-6 text-text-primary focus:border-brand-500 focus:outline-none"
          placeholder={
            contentMode === "structured-json"
              ? `{"kind":"site-page-content","pageType":"${summary.pageType ?? "custom"}","locale":"${locale}","title":"...","sections":[]}`
              : "Plain text, markdown-style copy, or other legacy page content."
          }
        />
      )}
    </div>
  );
}

function PageModal({
  item,
  onClose,
}: {
  item: ContentPage | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PageFormState>(() => pageToForm(item));
  const [saving, setSaving] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  const create = useCreatePage();
  const update = useUpdatePage();

  useEffect(() => {
    setForm(pageToForm(item));
  }, [item]);

  function setField<K extends keyof PageFormState>(field: K, value: PageFormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function setMode(nextMode: PageContentMode) {
    setForm((prev) => {
      if (prev.contentMode === nextMode) return prev;

      if (nextMode === "structured-json") {
        const titleEn = localizedTitle(prev, "en");
        return {
          ...prev,
          contentMode: nextMode,
          contentEn: prev.contentEn.trim()
            ? wrapLongFormAsStructuredDocument(prev.contentEn, {
                pageType: prev.pageTemplate,
                locale: "en",
                title: titleEn,
                summary: prev.metaDescription.trim() || undefined,
                metaTitle: prev.metaTitle.trim() || undefined,
                metaDescription: prev.metaDescription.trim() || undefined,
              })
            : createStructuredPageStarter({
                pageType: prev.pageTemplate,
                locale: "en",
                title: titleEn,
                summary: prev.metaDescription.trim() || undefined,
                metaTitle: prev.metaTitle.trim() || undefined,
                metaDescription: prev.metaDescription.trim() || undefined,
              }),
          contentHi: prev.contentHi.trim()
            ? wrapLongFormAsStructuredDocument(prev.contentHi, {
                pageType: prev.pageTemplate,
                locale: "hi",
                title: localizedTitle(prev, "hi"),
                summary: prev.metaDescription.trim() || undefined,
                metaTitle: prev.metaTitle.trim() || undefined,
                metaDescription: prev.metaDescription.trim() || undefined,
              })
            : createStructuredPageStarter({
                pageType: prev.pageTemplate,
                locale: "hi",
                title: localizedTitle(prev, "hi"),
                summary: prev.metaDescription.trim() || undefined,
                metaTitle: prev.metaTitle.trim() || undefined,
                metaDescription: prev.metaDescription.trim() || undefined,
              }),
          contentMr: prev.contentMr.trim()
            ? wrapLongFormAsStructuredDocument(prev.contentMr, {
                pageType: prev.pageTemplate,
                locale: "mr",
                title: localizedTitle(prev, "mr"),
                summary: prev.metaDescription.trim() || undefined,
                metaTitle: prev.metaTitle.trim() || undefined,
                metaDescription: prev.metaDescription.trim() || undefined,
              })
            : createStructuredPageStarter({
                pageType: prev.pageTemplate,
                locale: "mr",
                title: localizedTitle(prev, "mr"),
                summary: prev.metaDescription.trim() || undefined,
                metaTitle: prev.metaTitle.trim() || undefined,
                metaDescription: prev.metaDescription.trim() || undefined,
              }),
        };
      }

      return {
        ...prev,
        contentMode: nextMode,
        contentEn: flattenStructuredDocument(prev.contentEn),
        contentHi: flattenStructuredDocument(prev.contentHi),
        contentMr: flattenStructuredDocument(prev.contentMr),
      };
    });
  }

  function applyStarterDocument() {
    setForm((prev) => {
      const titleEn = localizedTitle(prev, "en");
      return {
        ...prev,
        contentMode: "structured-json",
        contentEn: createStructuredPageStarter({
          pageType: prev.pageTemplate,
          locale: "en",
          title: titleEn,
          summary: prev.metaDescription.trim() || undefined,
          metaTitle: prev.metaTitle.trim() || undefined,
          metaDescription: prev.metaDescription.trim() || undefined,
        }),
        contentHi: createStructuredPageStarter({
          pageType: prev.pageTemplate,
          locale: "hi",
          title: localizedTitle(prev, "hi"),
          summary: prev.metaDescription.trim() || undefined,
          metaTitle: prev.metaTitle.trim() || undefined,
          metaDescription: prev.metaDescription.trim() || undefined,
        }),
        contentMr: createStructuredPageStarter({
          pageType: prev.pageTemplate,
          locale: "mr",
          title: localizedTitle(prev, "mr"),
          summary: prev.metaDescription.trim() || undefined,
          metaTitle: prev.metaTitle.trim() || undefined,
          metaDescription: prev.metaDescription.trim() || undefined,
        }),
      };
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const slug = normalizeSlug(form.slug);
    if (!slug) {
      toast.error("Slug is required");
      return;
    }
    if (!form.titleEn.trim()) {
      toast.error("English title is required");
      return;
    }
    if (!form.contentEn.trim()) {
      toast.error("English content is required");
      return;
    }
    if (form.status === "SCHEDULED" && !form.publishedAt) {
      toast.error("Published at is required for scheduled pages");
      return;
    }

    const buildContent = (value: string, locale: PageLocale, title: string) => {
      const trimmed = value.trim();
      if (form.contentMode === "long-form") return trimmed;
      if (!trimmed) {
        return createStructuredPageStarter({
          pageType: form.pageTemplate,
          locale,
          title,
          summary: form.metaDescription.trim() || undefined,
          metaTitle: form.metaTitle.trim() || undefined,
          metaDescription: form.metaDescription.trim() || undefined,
        });
      }

      const pretty = prettyPrintPageContent(trimmed);
      if (pretty.mode !== "structured-json") {
        throw new Error(`Locale ${locale.toUpperCase()} content must be valid JSON in structured mode`);
      }

      return pretty.content;
    };

    let payload: ContentPageInput;
    try {
      payload = {
        slug,
        titleEn: form.titleEn.trim(),
        titleHi: form.titleHi.trim() || null,
        titleMr: form.titleMr.trim() || null,
        contentEn: buildContent(form.contentEn, "en", localizedTitle(form, "en")),
        contentHi: buildContent(form.contentHi, "hi", localizedTitle(form, "hi")),
        contentMr: buildContent(form.contentMr, "mr", localizedTitle(form, "mr")),
        metaTitle: form.metaTitle.trim() || null,
        metaDescription: form.metaDescription.trim() || null,
        isPublished: form.status === "PUBLISHED" || form.status === "SCHEDULED",
        publishedAt:
          form.status === "SCHEDULED" && form.publishedAt
            ? new Date(form.publishedAt).toISOString()
            : null,
      };
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid page content");
      return;
    }

    setSaving(true);
    try {
      const saved = item
        ? await update.mutateAsync({ id: item.id, data: payload })
        : await create.mutateAsync(payload);
      await updateCmsEntryStatus("pages", String(saved.id), {
        status: form.status,
        publishedAt:
          form.status === "SCHEDULED" && form.publishedAt
            ? new Date(form.publishedAt).toISOString()
            : null,
      });
      await queryClient.invalidateQueries({ queryKey: contentKeys.pages });
      if (item) {
        toast.success("Page updated");
      } else {
        toast.success("Page created");
      }
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save page";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const formatSummary = summarizePageContent(form.contentEn);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              {item ? "Edit Page" : "Add Page"}
            </h2>
            <p className="mt-0.5 text-sm text-text-secondary">
              Route-driven content for public pages. Store either plain text or structured JSON in the existing page fields.
            </p>
          </div>
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

        <form onSubmit={handleSubmit} className="overflow-y-auto p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Slug *</label>
              <input
                value={form.slug}
                onChange={(event) => setField("slug", event.target.value)}
                placeholder="about"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Preview route</label>
              <div className="rounded-lg border border-border bg-surface-secondary px-3 py-2 text-sm text-text-secondary">
                /en/{normalizeSlug(form.slug) || "page-slug"}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Title (EN) *</label>
              <input
                value={form.titleEn}
                onChange={(event) => setField("titleEn", event.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Title (HI)</label>
              <input
                value={form.titleHi}
                onChange={(event) => setField("titleHi", event.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Title (MR)</label>
              <input
                value={form.titleMr}
                onChange={(event) => setField("titleMr", event.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Meta Title</label>
              <input
                value={form.metaTitle}
                onChange={(event) => setField("metaTitle", event.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Meta Description</label>
              <input
                value={form.metaDescription}
                onChange={(event) => setField("metaDescription", event.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4">
            <WorkflowStatusField
              status={form.status}
              publishedAt={form.publishedAt}
              onStatusChange={(status) => setField("status", status)}
              onPublishedAtChange={(value) => setField("publishedAt", value)}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface-secondary p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-text-tertiary inline-flex items-center gap-1.5">
                <FileCode2 className="h-3.5 w-3.5" />
                Content mode
              </div>
              <div className="mt-3">
                <select
                  value={form.contentMode}
                  onChange={(event) => setMode(event.target.value as PageContentMode)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                >
                  <option value="structured-json">Structured JSON</option>
                  <option value="long-form">Long-form text</option>
                </select>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={applyStarterDocument}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate starter structure
                </button>
                {form.contentMode === "structured-json" ? (
                  <button
                    type="button"
                    onClick={() => setMode("long-form")}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Flatten to long-form
                  </button>
                ) : null}
              </div>
            </div>

          <div className="rounded-2xl border border-border bg-surface-secondary p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-text-tertiary inline-flex items-center gap-1.5">
                <Layers3 className="h-3.5 w-3.5" />
                Template
              </div>
              <div className="mt-3">
                <select
                  value={form.pageTemplate}
                  onChange={(event) => setField("pageTemplate", event.target.value as PageTemplateKey)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                >
                  {PAGE_TEMPLATE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 text-xs leading-6 text-text-secondary">
                {pageTemplateDescription(form.pageTemplate)}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface-secondary p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Current summary</div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-text-secondary">
                  {formatSummary.mode === "structured-json" ? "Structured JSON" : "Long-form text"}
                </span>
                {formatSummary.pageType ? (
                  <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-text-secondary">
                    {pageTemplateLabel(formatSummary.pageType)}
                  </span>
                ) : null}
                <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-text-secondary">
                  {formatSummary.sectionCount ?? 0} section(s)
                </span>
              </div>
              <div className="mt-3 text-xs leading-6 text-text-secondary">
                Structured pages use the section builder and still save into the same validated JSON contract in the database.
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            {LOCALES.map((locale) => (
              <LocaleEditor
                key={locale.key}
                locale={locale.key}
                label={locale.label}
                hint={locale.hint}
                value={
                  locale.key === "en"
                    ? form.contentEn
                    : locale.key === "hi"
                      ? form.contentHi
                      : form.contentMr
                }
                contentMode={form.contentMode}
                pageTemplate={form.pageTemplate}
                title={localizedTitle(form, locale.key)}
                summaryText={form.metaDescription.trim() || undefined}
                metaTitle={form.metaTitle.trim() || undefined}
                metaDescription={form.metaDescription.trim() || undefined}
                onChange={(value) =>
                  setField(
                    locale.key === "en"
                      ? "contentEn"
                      : locale.key === "hi"
                        ? "contentHi"
                      : "contentMr",
                    value,
                  )
                }
                onConvertToStructured={() => {
                  const current =
                    locale.key === "en"
                      ? form.contentEn
                      : locale.key === "hi"
                        ? form.contentHi
                        : form.contentMr;
                  const wrapped = current.trim()
                    ? wrapLongFormAsStructuredDocument(current, {
                        pageType: form.pageTemplate,
                        locale: locale.key,
                        title: localizedTitle(form, locale.key),
                        summary: form.metaDescription.trim() || undefined,
                        metaTitle: form.metaTitle.trim() || undefined,
                        metaDescription: form.metaDescription.trim() || undefined,
                      })
                    : createStructuredPageStarter({
                        pageType: form.pageTemplate,
                        locale: locale.key,
                        title: localizedTitle(form, locale.key),
                        summary: form.metaDescription.trim() || undefined,
                        metaTitle: form.metaTitle.trim() || undefined,
                        metaDescription: form.metaDescription.trim() || undefined,
                      });
                  setField(
                    locale.key === "en"
                      ? "contentEn"
                      : locale.key === "hi"
                        ? "contentHi"
                        : "contentMr",
                    wrapped,
                  );
                  setField("contentMode", "structured-json");
                }}
                onFlatten={() => {
                  const current =
                    locale.key === "en"
                      ? form.contentEn
                      : locale.key === "hi"
                        ? form.contentHi
                        : form.contentMr;
                  const flattened = flattenStructuredDocument(current);
                  setField(
                    locale.key === "en"
                      ? "contentEn"
                      : locale.key === "hi"
                        ? "contentHi"
                        : "contentMr",
                    flattened,
                  );
                }}
              />
            ))}
          </div>

          <div className="mt-5 flex gap-2">
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
              {saving ? "Saving..." : item ? "Save Changes" : "Create Page"}
            </button>
          </div>
        </form>
        {item ? (
          <RevisionHistoryPanel
            collection="pages"
            entryId={String(item.id)}
            isOpen={showRevisions}
            onClose={() => setShowRevisions(false)}
            onRestored={() => {
              queryClient.invalidateQueries({ queryKey: contentKeys.pages });
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

export default function ContentPagesPage() {
  const { data: items = [], isLoading } = usePages();
  const del = useDeletePage();
  const [editing, setEditing] = useState<ContentPage | "new" | null>(null);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.slug.localeCompare(b.slug)),
    [items],
  );

  const pageSummaries = useMemo(() => {
    return new Map(
      sortedItems.map((item) => [
        item.id,
        summarizePageContent(item.contentEn),
      ]),
    );
  }, [sortedItems]);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this page? This cannot be undone.")) return;
    try {
      await del.mutateAsync(id);
      toast.success("Page deleted");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed";
      toast.error(message);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Pages</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Manage route-driven page content, with a choice of long-form text or structured JSON.
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" />
          Add Page
        </button>
      </div>

      {isLoading && (
        <div className="mt-4 space-y-2">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-lg bg-surface-secondary" />
          ))}
        </div>
      )}

      {!isLoading && sortedItems.length === 0 && (
        <div className="mt-8 py-12 text-center text-text-tertiary">
          <p className="text-sm">No CMS pages yet. Add your first page to drive a public route.</p>
        </div>
      )}

      {!isLoading && sortedItems.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  Slug
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  English title
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  Format
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  Template
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  Locale coverage
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  Updated
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => {
                const summary = pageSummaries.get(item.id);
                return (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-secondary/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-text-primary">/{item.slug}</div>
                      <div className="text-xs text-text-tertiary">/en/{item.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-text-primary">{item.titleEn}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          summary?.mode === "structured-json"
                            ? "bg-brand-50 text-brand-700"
                            : "bg-surface-secondary text-text-tertiary"
                        }`}
                      >
                        {summary?.mode === "structured-json" ? "Structured JSON" : "Long-form text"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {summary?.pageType ? pageTemplateLabel(summary.pageType) : "Legacy"}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {[
                        item.titleHi || item.contentHi,
                        item.titleMr || item.contentMr,
                      ].filter(Boolean).length} translated
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const badge = pageStatusBadge(deriveWorkflowStatus(item));
                        return (
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(item.updatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditing(item)}
                          className="text-text-tertiary hover:text-text-primary"
                          aria-label={`Edit ${item.slug}`}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-text-tertiary hover:text-danger-600"
                          aria-label={`Delete ${item.slug}`}
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
        <PageModal
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
