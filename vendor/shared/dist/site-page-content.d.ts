export declare const PAGE_LOCALES: readonly ["en", "hi", "mr"];
export declare const PAGE_TEMPLATE_KEYS: readonly ["custom", "landing", "about", "policy", "contact"];
export declare const STRUCTURED_PAGE_KIND = "site-page-content";
export type PageLocale = (typeof PAGE_LOCALES)[number];
export type PageContentMode = "long-form" | "structured-json";
export type PageTemplateKey = (typeof PAGE_TEMPLATE_KEYS)[number];
export interface PageAction {
    label: string;
    href: string;
    variant?: "default" | "outline";
}
export interface PageMetric {
    value: string;
    label: string;
    detail?: string;
}
export interface PageSectionHero {
    type: "hero";
    eyebrow?: string;
    title: string;
    description?: string;
    metrics?: PageMetric[];
    actions?: PageAction[];
}
export interface PageSectionProse {
    type: "prose";
    heading?: string;
    body: string;
}
export interface PageSectionCards {
    type: "cards";
    heading?: string;
    cards: Array<{
        title: string;
        description: string;
        note?: string;
    }>;
}
export interface PageSectionStats {
    type: "stats";
    heading?: string;
    items: PageMetric[];
}
export interface PageSectionCta {
    type: "cta";
    eyebrow?: string;
    title: string;
    description?: string;
    actions?: PageAction[];
}
export type PageSection = PageSectionHero | PageSectionProse | PageSectionCards | PageSectionStats | PageSectionCta;
export interface StructuredPageDocument {
    kind: typeof STRUCTURED_PAGE_KIND;
    pageType: PageTemplateKey;
    locale: PageLocale;
    title: string;
    summary?: string;
    metaTitle?: string;
    metaDescription?: string;
    sections: PageSection[];
}
export interface PageContentSummary {
    mode: PageContentMode;
    valid: boolean;
    title?: string;
    pageType?: PageTemplateKey;
    sectionCount?: number;
    error?: string;
}
export declare const PAGE_TEMPLATE_OPTIONS: Array<{
    value: PageTemplateKey;
    label: string;
    description: string;
}>;
export declare function suggestPageTemplate(slug: string): PageTemplateKey;
export declare function detectPageContentMode(value: string): PageContentMode;
export declare function parseJsonContent(value: string): {
    value: unknown;
    error: string | null;
};
export declare function parseStructuredPageDocument(value: string): {
    document: StructuredPageDocument | null;
    error: string | null;
};
export declare function prettyPrintPageContent(value: string): {
    content: string;
    mode: PageContentMode;
    error: string | null;
};
export declare function wrapLongFormAsStructuredDocument(value: string, options: {
    pageType: PageTemplateKey;
    locale: PageLocale;
    title: string;
    summary?: string;
    metaTitle?: string;
    metaDescription?: string;
}): string;
export declare function flattenStructuredDocument(value: string): string;
export declare function createStructuredPageStarter(input: {
    pageType: PageTemplateKey;
    locale: PageLocale;
    title: string;
    summary?: string;
    metaTitle?: string;
    metaDescription?: string;
}): string;
export declare function summarizePageContent(value: string): PageContentSummary;
