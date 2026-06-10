"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAGE_TEMPLATE_OPTIONS = exports.STRUCTURED_PAGE_KIND = exports.PAGE_TEMPLATE_KEYS = exports.PAGE_LOCALES = void 0;
exports.suggestPageTemplate = suggestPageTemplate;
exports.detectPageContentMode = detectPageContentMode;
exports.parseJsonContent = parseJsonContent;
exports.parseStructuredPageDocument = parseStructuredPageDocument;
exports.prettyPrintPageContent = prettyPrintPageContent;
exports.wrapLongFormAsStructuredDocument = wrapLongFormAsStructuredDocument;
exports.flattenStructuredDocument = flattenStructuredDocument;
exports.createStructuredPageStarter = createStructuredPageStarter;
exports.summarizePageContent = summarizePageContent;
exports.PAGE_LOCALES = ["en", "hi", "mr"];
exports.PAGE_TEMPLATE_KEYS = ["custom", "landing", "about", "policy", "contact"];
exports.STRUCTURED_PAGE_KIND = "site-page-content";
exports.PAGE_TEMPLATE_OPTIONS = [
    {
        value: "custom",
        label: "Custom",
        description: "Freeform structured content with no starter layout.",
    },
    {
        value: "landing",
        label: "Landing page",
        description: "Hero, proof, supporting cards, and CTA blocks.",
    },
    {
        value: "about",
        label: "About page",
        description: "Story-led pages with hero, prose, and supporting sections.",
    },
    {
        value: "policy",
        label: "Policy page",
        description: "Long-form legal or policy content.",
    },
    {
        value: "contact",
        label: "Contact page",
        description: "Contact-first pages with quick actions and support blocks.",
    },
];
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}
function looksStructured(value) {
    return value.trim().startsWith("{");
}
function isPageTemplateKey(value) {
    return typeof value === "string" && exports.PAGE_TEMPLATE_KEYS.includes(value);
}
function isPageLocale(value) {
    return typeof value === "string" && exports.PAGE_LOCALES.includes(value);
}
function isMetric(value) {
    return (isRecord(value) &&
        isNonEmptyString(value.value) &&
        isNonEmptyString(value.label) &&
        (value.detail === undefined || typeof value.detail === "string"));
}
function isAction(value) {
    return (isRecord(value) &&
        isNonEmptyString(value.label) &&
        isNonEmptyString(value.href) &&
        (value.variant === undefined || value.variant === "default" || value.variant === "outline"));
}
function isSection(value) {
    if (!isRecord(value) || typeof value.type !== "string")
        return false;
    switch (value.type) {
        case "hero":
            return (isNonEmptyString(value.title) &&
                (value.eyebrow === undefined || typeof value.eyebrow === "string") &&
                (value.description === undefined || typeof value.description === "string") &&
                (value.metrics === undefined || (Array.isArray(value.metrics) && value.metrics.every(isMetric))) &&
                (value.actions === undefined || (Array.isArray(value.actions) && value.actions.every(isAction))));
        case "prose":
            return isNonEmptyString(value.body) && (value.heading === undefined || typeof value.heading === "string");
        case "cards":
            return (Array.isArray(value.cards) &&
                value.cards.every((card) => isRecord(card) &&
                    isNonEmptyString(card.title) &&
                    isNonEmptyString(card.description) &&
                    (card.note === undefined || typeof card.note === "string")) &&
                (value.heading === undefined || typeof value.heading === "string"));
        case "stats":
            return (Array.isArray(value.items) &&
                value.items.every(isMetric) &&
                (value.heading === undefined || typeof value.heading === "string"));
        case "cta":
            return (isNonEmptyString(value.title) &&
                (value.eyebrow === undefined || typeof value.eyebrow === "string") &&
                (value.description === undefined || typeof value.description === "string") &&
                (value.actions === undefined || (Array.isArray(value.actions) && value.actions.every(isAction))));
        default:
            return false;
    }
}
function suggestPageTemplate(slug) {
    const normalized = slug.trim().toLowerCase();
    if (!normalized)
        return "landing";
    if (normalized.includes("privacy") || normalized.includes("terms") || normalized.includes("refund")) {
        return "policy";
    }
    if (normalized.includes("about"))
        return "about";
    if (normalized.includes("contact"))
        return "contact";
    if (normalized === "home" || normalized === "index" || normalized === "landing")
        return "landing";
    return "custom";
}
function detectPageContentMode(value) {
    return looksStructured(value) ? "structured-json" : "long-form";
}
function parseJsonContent(value) {
    const trimmed = value.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
        return { value: null, error: null };
    }
    try {
        return { value: JSON.parse(trimmed), error: null };
    }
    catch (error) {
        return {
            value: null,
            error: error instanceof Error ? error.message : "Invalid JSON",
        };
    }
}
function parseStructuredPageDocument(value) {
    const json = parseJsonContent(value);
    if (json.error) {
        return { document: null, error: json.error };
    }
    if (!json.value) {
        return { document: null, error: null };
    }
    if (!isRecord(json.value)) {
        return { document: null, error: "JSON must be an object" };
    }
    if (json.value.kind !== exports.STRUCTURED_PAGE_KIND) {
        return { document: null, error: `Missing kind=${exports.STRUCTURED_PAGE_KIND}` };
    }
    if (!isPageTemplateKey(json.value.pageType)) {
        return { document: null, error: "pageType must be one of custom, landing, about, policy, or contact" };
    }
    if (!isPageLocale(json.value.locale)) {
        return { document: null, error: "locale must be one of en, hi, or mr" };
    }
    if (!isNonEmptyString(json.value.title)) {
        return { document: null, error: "title must be a non-empty string" };
    }
    if (!Array.isArray(json.value.sections) || !json.value.sections.every(isSection)) {
        return { document: null, error: "sections must be an array of structured blocks" };
    }
    return {
        document: {
            kind: exports.STRUCTURED_PAGE_KIND,
            pageType: json.value.pageType,
            locale: json.value.locale,
            title: json.value.title.trim(),
            summary: typeof json.value.summary === "string" ? json.value.summary : undefined,
            metaTitle: typeof json.value.metaTitle === "string" ? json.value.metaTitle : undefined,
            metaDescription: typeof json.value.metaDescription === "string" ? json.value.metaDescription : undefined,
            sections: json.value.sections,
        },
        error: null,
    };
}
function prettyPrintPageContent(value) {
    const parsed = parseStructuredPageDocument(value);
    if (!parsed.document) {
        return { content: value, mode: "long-form", error: parsed.error };
    }
    return {
        content: JSON.stringify(parsed.document, null, 2),
        mode: "structured-json",
        error: null,
    };
}
function wrapLongFormAsStructuredDocument(value, options) {
    const body = value.trim();
    const document = {
        kind: exports.STRUCTURED_PAGE_KIND,
        pageType: options.pageType,
        locale: options.locale,
        title: options.title,
        summary: options.summary,
        metaTitle: options.metaTitle,
        metaDescription: options.metaDescription,
        sections: body
            ? [
                {
                    type: "prose",
                    heading: options.title,
                    body,
                },
            ]
            : [],
    };
    return JSON.stringify(document, null, 2);
}
function flattenStructuredDocument(value) {
    const parsed = parseStructuredPageDocument(value);
    if (!parsed.document)
        return value;
    const lines = [];
    for (const section of parsed.document.sections) {
        if (section.type === "hero") {
            if (section.eyebrow)
                lines.push(section.eyebrow);
            lines.push(section.title);
            if (section.description)
                lines.push(section.description);
            continue;
        }
        if (section.type === "prose") {
            if (section.heading)
                lines.push(section.heading);
            lines.push(section.body);
            continue;
        }
        if (section.type === "cards") {
            if (section.heading)
                lines.push(section.heading);
            for (const card of section.cards) {
                lines.push(card.title);
                lines.push(card.description);
                if (card.note)
                    lines.push(card.note);
            }
            continue;
        }
        if (section.type === "stats") {
            if (section.heading)
                lines.push(section.heading);
            for (const item of section.items) {
                lines.push(`${item.value} ${item.label}`);
                if (item.detail)
                    lines.push(item.detail);
            }
            continue;
        }
        if (section.type === "cta") {
            if (section.eyebrow)
                lines.push(section.eyebrow);
            lines.push(section.title);
            if (section.description)
                lines.push(section.description);
        }
    }
    return lines.join("\n\n").trim();
}
function createStructuredPageStarter(input) {
    const sections = (() => {
        switch (input.pageType) {
            case "policy":
                return [
                    {
                        type: "prose",
                        heading: input.title,
                        body: input.summary || "Policy content goes here.",
                    },
                ];
            case "about":
                return [
                    {
                        type: "hero",
                        eyebrow: "About",
                        title: input.title,
                        description: input.summary || "Tell the story of the brand here.",
                    },
                    {
                        type: "prose",
                        heading: "Story",
                        body: "Add the long-form brand story, milestones, and values here.",
                    },
                    {
                        type: "cta",
                        eyebrow: "Next step",
                        title: "Invite visitors to take action",
                        description: "Link to contact, menu, or a related page.",
                    },
                ];
            case "contact":
                return [
                    {
                        type: "hero",
                        eyebrow: "Contact",
                        title: input.title,
                        description: input.summary || "Help visitors reach the business quickly.",
                    },
                    {
                        type: "cards",
                        heading: "Contact channels",
                        cards: [
                            {
                                title: "Phone",
                                description: "Primary phone number from brand settings.",
                            },
                            {
                                title: "Email",
                                description: "Primary email address from brand settings.",
                            },
                        ],
                    },
                ];
            case "landing":
                return [
                    {
                        type: "hero",
                        eyebrow: "Landing page",
                        title: input.title,
                        description: input.summary || "Set the core value proposition here.",
                        actions: [
                            { label: "Get started", href: "/contact" },
                            { label: "Learn more", href: "/about", variant: "outline" },
                        ],
                    },
                    {
                        type: "stats",
                        heading: "Proof points",
                        items: [
                            { value: "0+", label: "Replace me" },
                            { value: "0+", label: "Replace me" },
                        ],
                    },
                    {
                        type: "cta",
                        eyebrow: "Call to action",
                        title: "Ask visitors to take the next step",
                    },
                ];
            default:
                return [
                    {
                        type: "prose",
                        heading: input.title,
                        body: input.summary || "Write the page content here.",
                    },
                ];
        }
    })();
    const document = {
        kind: exports.STRUCTURED_PAGE_KIND,
        pageType: input.pageType,
        locale: input.locale,
        title: input.title,
        summary: input.summary,
        metaTitle: input.metaTitle,
        metaDescription: input.metaDescription,
        sections,
    };
    return JSON.stringify(document, null, 2);
}
function summarizePageContent(value) {
    const parsed = parseStructuredPageDocument(value);
    const mode = looksStructured(value) ? "structured-json" : "long-form";
    if (parsed.document) {
        return {
            mode,
            valid: true,
            title: parsed.document.title,
            pageType: parsed.document.pageType,
            sectionCount: parsed.document.sections.length,
        };
    }
    const trimmed = value.trim();
    return {
        mode,
        valid: mode === "long-form",
        sectionCount: trimmed ? 1 : 0,
        error: mode === "structured-json" ? (parsed.error ?? "Invalid JSON") : undefined,
    };
}
