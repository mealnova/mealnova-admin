"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import {
  createStructuredPageStarter,
  parseStructuredPageDocument,
  type PageAction,
  type PageLocale,
  type PageMetric,
  type PageSection,
  type PageSectionCards,
  type PageSectionCta,
  type PageSectionHero,
  type PageSectionProse,
  type PageSectionStats,
  type PageTemplateKey,
  type StructuredPageDocument,
} from "@/lib/page-content-editor";

type StructuredPageBuilderProps = {
  locale: PageLocale;
  value: string;
  pageTemplate: PageTemplateKey;
  title: string;
  summary?: string;
  metaTitle?: string;
  metaDescription?: string;
  onChange: (value: string) => void;
};

type SectionType = PageSection["type"];

function syncDocument(
  document: StructuredPageDocument,
  props: Omit<StructuredPageBuilderProps, "value" | "onChange">,
): StructuredPageDocument {
  return {
    ...document,
    pageType: props.pageTemplate,
    locale: props.locale,
    title: props.title,
    summary: props.summary,
    metaTitle: props.metaTitle,
    metaDescription: props.metaDescription,
  };
}

function defaultMetric(): PageMetric {
  return {
    value: "0+",
    label: "Replace me",
    detail: "",
  };
}

function defaultAction(): PageAction {
  return {
    label: "Learn more",
    href: "/contact",
    variant: "default",
  };
}

function defaultSection(type: SectionType, fallbackTitle: string): PageSection {
  switch (type) {
    case "hero":
      return {
        type,
        eyebrow: "",
        title: fallbackTitle,
        description: "",
        metrics: [],
        actions: [],
      };
    case "prose":
      return {
        type,
        heading: fallbackTitle,
        body: "",
      };
    case "cards":
      return {
        type,
        heading: "Highlights",
        cards: [{ title: "Card title", description: "", note: "" }],
      };
    case "stats":
      return {
        type,
        heading: "Proof points",
        items: [defaultMetric()],
      };
    case "cta":
      return {
        type,
        eyebrow: "",
        title: "Call to action",
        description: "",
        actions: [defaultAction()],
      };
  }
}

function sectionTitle(section: PageSection) {
  switch (section.type) {
    case "hero":
      return section.title || "Hero";
    case "prose":
      return section.heading || "Prose";
    case "cards":
      return section.heading || "Cards";
    case "stats":
      return section.heading || "Stats";
    case "cta":
      return section.title || "CTA";
  }
}

function setOptionalString(value: string) {
  return value.trim() || undefined;
}

function replaceAt<T>(items: T[], index: number, nextItem: T) {
  return items.map((item, itemIndex) => (itemIndex === index ? nextItem : item));
}

function MetricListEditor({
  items,
  onChange,
}: {
  items: PageMetric[] | undefined;
  onChange: (items: PageMetric[]) => void;
}) {
  const safeItems = items ?? [];

  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface-secondary p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Metrics</div>
        <button
          type="button"
          onClick={() => onChange([...safeItems, defaultMetric()])}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-text-secondary hover:text-text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Metric
        </button>
      </div>
      {safeItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white px-3 py-3 text-xs text-text-tertiary">
          No metrics yet.
        </div>
      ) : (
        safeItems.map((item, index) => (
          <div key={index} className="grid gap-2 rounded-lg border border-border bg-white p-3 md:grid-cols-[1fr,1.4fr,1.4fr,auto]">
            <input
              value={item.value}
              onChange={(event) =>
                onChange(replaceAt(safeItems, index, { ...item, value: event.target.value }))
              }
              placeholder="0+"
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
            <input
              value={item.label}
              onChange={(event) =>
                onChange(replaceAt(safeItems, index, { ...item, label: event.target.value }))
              }
              placeholder="Metric label"
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
            <input
              value={item.detail ?? ""}
              onChange={(event) =>
                onChange(
                  replaceAt(safeItems, index, {
                    ...item,
                    detail: setOptionalString(event.target.value),
                  }),
                )
              }
              placeholder="Optional detail"
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onChange(safeItems.filter((_, itemIndex) => itemIndex !== index))}
              className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:text-danger-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function ActionListEditor({
  items,
  onChange,
}: {
  items: PageAction[] | undefined;
  onChange: (items: PageAction[]) => void;
}) {
  const safeItems = items ?? [];

  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface-secondary p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Actions</div>
        <button
          type="button"
          onClick={() => onChange([...safeItems, defaultAction()])}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-text-secondary hover:text-text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Action
        </button>
      </div>
      {safeItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white px-3 py-3 text-xs text-text-tertiary">
          No actions yet.
        </div>
      ) : (
        safeItems.map((item, index) => (
          <div key={index} className="grid gap-2 rounded-lg border border-border bg-white p-3 md:grid-cols-[1.1fr,1.4fr,0.9fr,auto]">
            <input
              value={item.label}
              onChange={(event) =>
                onChange(replaceAt(safeItems, index, { ...item, label: event.target.value }))
              }
              placeholder="Action label"
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
            <input
              value={item.href}
              onChange={(event) =>
                onChange(replaceAt(safeItems, index, { ...item, href: event.target.value }))
              }
              placeholder="/contact"
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
            <select
              value={item.variant ?? "default"}
              onChange={(event) =>
                onChange(
                  replaceAt(safeItems, index, {
                    ...item,
                    variant: event.target.value as PageAction["variant"],
                  }),
                )
              }
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            >
              <option value="default">Default</option>
              <option value="outline">Outline</option>
            </select>
            <button
              type="button"
              onClick={() => onChange(safeItems.filter((_, itemIndex) => itemIndex !== index))}
              className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:text-danger-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function CardsListEditor({
  section,
  onChange,
}: {
  section: PageSectionCards;
  onChange: (section: PageSectionCards) => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface-secondary p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Cards</div>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...section,
              cards: [...section.cards, { title: "Card title", description: "", note: "" }],
            })
          }
          className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-text-secondary hover:text-text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Card
        </button>
      </div>
      {section.cards.map((card, index) => (
        <div key={index} className="space-y-2 rounded-lg border border-border bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Card {index + 1}</div>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...section,
                  cards: section.cards.filter((_, cardIndex) => cardIndex !== index),
                })
              }
              className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-text-secondary hover:text-danger-600"
            >
              Remove
            </button>
          </div>
          <input
            value={card.title}
            onChange={(event) =>
              onChange({
                ...section,
                cards: replaceAt(section.cards, index, {
                  ...card,
                  title: event.target.value,
                }),
              })
            }
            placeholder="Card title"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
          />
          <textarea
            rows={3}
            value={card.description}
            onChange={(event) =>
              onChange({
                ...section,
                cards: replaceAt(section.cards, index, {
                  ...card,
                  description: event.target.value,
                }),
              })
            }
            placeholder="Card description"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none resize-none"
          />
          <input
            value={card.note ?? ""}
            onChange={(event) =>
              onChange({
                ...section,
                cards: replaceAt(section.cards, index, {
                  ...card,
                  note: setOptionalString(event.target.value),
                }),
              })
            }
            placeholder="Optional note"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
          />
        </div>
      ))}
    </div>
  );
}

function SectionEditor({
  section,
  onChange,
}: {
  section: PageSection;
  onChange: (section: PageSection) => void;
}) {
  switch (section.type) {
    case "hero":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={section.eyebrow ?? ""}
              onChange={(event) =>
                onChange({ ...section, eyebrow: setOptionalString(event.target.value) })
              }
              placeholder="Eyebrow"
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
            <input
              value={section.title}
              onChange={(event) => onChange({ ...section, title: event.target.value })}
              placeholder="Hero title"
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <textarea
            rows={4}
            value={section.description ?? ""}
            onChange={(event) =>
              onChange({ ...section, description: setOptionalString(event.target.value) })
            }
            placeholder="Hero description"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none resize-none"
          />
          <MetricListEditor
            items={section.metrics}
            onChange={(metrics) => onChange({ ...section, metrics })}
          />
          <ActionListEditor
            items={section.actions}
            onChange={(actions) => onChange({ ...section, actions })}
          />
        </div>
      );
    case "prose":
      return (
        <div className="space-y-3">
          <input
            value={section.heading ?? ""}
            onChange={(event) =>
              onChange({ ...section, heading: setOptionalString(event.target.value) })
            }
            placeholder="Heading"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
          />
          <textarea
            rows={8}
            value={section.body}
            onChange={(event) => onChange({ ...section, body: event.target.value })}
            placeholder="Write the section body"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none resize-none"
          />
        </div>
      );
    case "cards":
      return (
        <div className="space-y-3">
          <input
            value={section.heading ?? ""}
            onChange={(event) =>
              onChange({ ...section, heading: setOptionalString(event.target.value) })
            }
            placeholder="Section heading"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
          />
          <CardsListEditor section={section} onChange={onChange} />
        </div>
      );
    case "stats":
      return (
        <div className="space-y-3">
          <input
            value={section.heading ?? ""}
            onChange={(event) =>
              onChange({ ...section, heading: setOptionalString(event.target.value) })
            }
            placeholder="Section heading"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
          />
          <MetricListEditor
            items={section.items}
            onChange={(items) => onChange({ ...section, items })}
          />
        </div>
      );
    case "cta":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={section.eyebrow ?? ""}
              onChange={(event) =>
                onChange({ ...section, eyebrow: setOptionalString(event.target.value) })
              }
              placeholder="Eyebrow"
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
            <input
              value={section.title}
              onChange={(event) => onChange({ ...section, title: event.target.value })}
              placeholder="CTA title"
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            />
          </div>
          <textarea
            rows={4}
            value={section.description ?? ""}
            onChange={(event) =>
              onChange({ ...section, description: setOptionalString(event.target.value) })
            }
            placeholder="CTA description"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none resize-none"
          />
          <ActionListEditor
            items={section.actions}
            onChange={(actions) => onChange({ ...section, actions })}
          />
        </div>
      );
  }
}

export function StructuredPageBuilder(props: StructuredPageBuilderProps) {
  const parsed = parseStructuredPageDocument(props.value);
  const baseDocument = parsed.document
    ? syncDocument(parsed.document, props)
    : JSON.parse(
        createStructuredPageStarter({
          pageType: props.pageTemplate,
          locale: props.locale,
          title: props.title,
          summary: props.summary,
          metaTitle: props.metaTitle,
          metaDescription: props.metaDescription,
        }),
      ) as StructuredPageDocument;

  function commit(nextDocument: StructuredPageDocument) {
    onChange(JSON.stringify(syncDocument(nextDocument, props), null, 2));
  }

  function onChange(nextValue: string) {
    props.onChange(nextValue);
  }

  function updateSection(index: number, nextSection: PageSection) {
    commit({
      ...baseDocument,
      sections: replaceAt(baseDocument.sections, index, nextSection),
    });
  }

  function moveSection(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= baseDocument.sections.length) {
      return;
    }

    const sections = [...baseDocument.sections];
    const [section] = sections.splice(index, 1);
    sections.splice(nextIndex, 0, section);
    commit({ ...baseDocument, sections });
  }

  function removeSection(index: number) {
    commit({
      ...baseDocument,
      sections: baseDocument.sections.filter((_, sectionIndex) => sectionIndex !== index),
    });
  }

  function addSection(type: SectionType) {
    commit({
      ...baseDocument,
      sections: [...baseDocument.sections, defaultSection(type, props.title)],
    });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-white px-3 py-3 text-xs text-text-secondary">
        Structured blocks are stored in the existing JSON field, but edited here as sections.
      </div>
      {baseDocument.sections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white px-4 py-5 text-sm text-text-tertiary">
          No sections yet. Add one below.
        </div>
      ) : (
        baseDocument.sections.map((section, index) => (
          <div key={`${section.type}-${index}`} className="rounded-2xl border border-border bg-white p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  {section.type}
                </div>
                <div className="mt-1 text-sm font-semibold text-text-primary">
                  {sectionTitle(section)}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => moveSection(index, -1)}
                  disabled={index === 0}
                  className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-40"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(index, 1)}
                  disabled={index === baseDocument.sections.length - 1}
                  className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-40"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeSection(index)}
                  className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:text-danger-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <SectionEditor section={section} onChange={(nextSection) => updateSection(index, nextSection)} />
          </div>
        ))
      )}
      <div className="rounded-2xl border border-border bg-surface-secondary p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          Add Section
        </div>
        <div className="flex flex-wrap gap-2">
          {(["hero", "prose", "cards", "stats", "cta"] as SectionType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addSection(type)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              {type}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
