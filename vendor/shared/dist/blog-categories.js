"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeBlogCategoryId = normalizeBlogCategoryId;
exports.getBlogCategoryQueryValues = getBlogCategoryQueryValues;
exports.formatBlogCategoryLabel = formatBlogCategoryLabel;
exports.buildBlogCategoryOptions = buildBlogCategoryOptions;
const BLOG_CATEGORY_ALIASES = {
    "behind-kitchen": "behind-the-kitchen",
    "behind-the-scenes": "behind-the-kitchen",
    "event": "event-stories",
    "events": "event-stories",
    "event-story": "event-stories",
    "corporate": "corporate-wellness",
    "wellness": "corporate-wellness",
};
const BLOG_CATEGORY_LABELS = {
    "corporate-wellness": "Corporate",
    "behind-the-kitchen": "Kitchen",
    recipes: "Menus",
    "event-stories": "Events",
};
function slugifyCategory(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
function normalizeBlogCategoryId(value) {
    const slug = typeof value === "string" ? slugifyCategory(value) : "";
    if (!slug)
        return "";
    return BLOG_CATEGORY_ALIASES[slug] ?? slug;
}
function getBlogCategoryQueryValues(value) {
    const normalized = normalizeBlogCategoryId(value);
    if (!normalized) {
        return [];
    }
    const values = new Set([normalized]);
    for (const [alias, canonical] of Object.entries(BLOG_CATEGORY_ALIASES)) {
        if (canonical === normalized) {
            values.add(alias);
        }
    }
    return [...values];
}
function formatBlogCategoryLabel(value) {
    const normalized = normalizeBlogCategoryId(value);
    if (!normalized)
        return "";
    return (BLOG_CATEGORY_LABELS[normalized] ??
        normalized
            .split("-")
            .filter(Boolean)
            .map((part) => part[0]?.toUpperCase() + part.slice(1))
            .join(" "));
}
function buildBlogCategoryOptions(values) {
    const options = new Map();
    for (const value of values) {
        const id = typeof value === "string"
            ? normalizeBlogCategoryId(value)
            : normalizeBlogCategoryId(value?.id ?? value?.label ?? "");
        if (!id || options.has(id)) {
            continue;
        }
        const label = typeof value === "object" && value?.label?.trim()
            ? value.label.trim()
            : formatBlogCategoryLabel(id);
        options.set(id, label);
    }
    return [...options.entries()].map(([id, label]) => ({ id, label }));
}
