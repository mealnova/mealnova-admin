export type CmsPreviewLocale = "en" | "hi" | "mr";
export type CmsPreviewCollection = "pages" | "blog" | "faqs" | "testimonials" | "gallery" | "careers" | "clientLogos" | "services" | "eventTypes" | "cuisines" | "pricing";
export type CmsPreviewRouteId = "home" | "about" | "contact" | "privacy-policy" | "refund-policy" | "terms-of-service" | "blog" | "blog-detail" | "faq" | "gallery" | "testimonials" | "careers" | "corporate" | "events";
export interface CmsPreviewRouteDefinition {
    id: CmsPreviewRouteId;
    label: string;
    template: string;
    pageSlug: string;
    collections: CmsPreviewCollection[];
    dynamicParam?: "slug";
}
export declare const CMS_PREVIEW_ROUTES: readonly CmsPreviewRouteDefinition[];
export type CmsPreviewRouteCandidate = {
    id: CmsPreviewRouteId;
    label: string;
};
export declare function normalizeCmsPreviewRoutePath(path: string): string;
export declare function getCmsPreviewRouteById(id: CmsPreviewRouteId): CmsPreviewRouteDefinition | null;
export declare function getCmsPreviewRouteByPageSlug(slug: string | null | undefined): CmsPreviewRouteDefinition | null;
export declare function buildCmsPreviewRoutePath(routeId: CmsPreviewRouteId, locale: CmsPreviewLocale, params?: {
    slug?: string | null;
}): string | null;
export declare function matchCmsPreviewRoute(path: string): {
    route: CmsPreviewRouteDefinition;
    locale: CmsPreviewLocale;
    params: {
        slug: string;
    } | {
        slug?: undefined;
    };
} | null;
export declare function getCmsPreviewRouteCandidates(input: {
    collection: CmsPreviewCollection;
    slug?: string | null;
}): {
    id: CmsPreviewRouteId;
    label: string;
}[];
