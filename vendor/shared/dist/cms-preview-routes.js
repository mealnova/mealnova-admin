"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CMS_PREVIEW_ROUTES = void 0;
exports.normalizeCmsPreviewRoutePath = normalizeCmsPreviewRoutePath;
exports.getCmsPreviewRouteById = getCmsPreviewRouteById;
exports.getCmsPreviewRouteByPageSlug = getCmsPreviewRouteByPageSlug;
exports.buildCmsPreviewRoutePath = buildCmsPreviewRoutePath;
exports.matchCmsPreviewRoute = matchCmsPreviewRoute;
exports.getCmsPreviewRouteCandidates = getCmsPreviewRouteCandidates;
exports.CMS_PREVIEW_ROUTES = [
    {
        id: "home",
        label: "Home",
        template: "/[locale]",
        pageSlug: "home",
        collections: ["pages", "services", "clientLogos", "testimonials"],
    },
    {
        id: "about",
        label: "About",
        template: "/[locale]/about",
        pageSlug: "about",
        collections: ["pages"],
    },
    {
        id: "contact",
        label: "Contact",
        template: "/[locale]/contact",
        pageSlug: "contact",
        collections: ["pages"],
    },
    {
        id: "privacy-policy",
        label: "Privacy Policy",
        template: "/[locale]/privacy-policy",
        pageSlug: "privacy-policy",
        collections: ["pages"],
    },
    {
        id: "refund-policy",
        label: "Refund Policy",
        template: "/[locale]/refund-policy",
        pageSlug: "refund-policy",
        collections: ["pages"],
    },
    {
        id: "terms-of-service",
        label: "Terms of Service",
        template: "/[locale]/terms-of-service",
        pageSlug: "terms-of-service",
        collections: ["pages"],
    },
    {
        id: "blog",
        label: "Blog Listing",
        template: "/[locale]/blog",
        pageSlug: "blog",
        collections: ["pages", "blog"],
    },
    {
        id: "blog-detail",
        label: "Blog Detail",
        template: "/[locale]/blog/[slug]",
        pageSlug: "blog-detail",
        collections: ["pages", "blog"],
        dynamicParam: "slug",
    },
    {
        id: "faq",
        label: "FAQ",
        template: "/[locale]/faq",
        pageSlug: "faq",
        collections: ["pages", "faqs"],
    },
    {
        id: "gallery",
        label: "Gallery",
        template: "/[locale]/gallery",
        pageSlug: "gallery",
        collections: ["pages", "gallery"],
    },
    {
        id: "testimonials",
        label: "Testimonials",
        template: "/[locale]/testimonials",
        pageSlug: "testimonials",
        collections: ["pages", "testimonials"],
    },
    {
        id: "careers",
        label: "Careers",
        template: "/[locale]/careers",
        pageSlug: "careers",
        collections: ["pages", "careers"],
    },
    {
        id: "corporate",
        label: "Corporate Catering",
        template: "/[locale]/corporate",
        pageSlug: "corporate",
        collections: ["pages", "pricing"],
    },
    {
        id: "events",
        label: "Events",
        template: "/[locale]/events",
        pageSlug: "events",
        collections: ["pages", "eventTypes", "cuisines", "pricing"],
    },
];
const ROUTE_BY_ID = new Map(exports.CMS_PREVIEW_ROUTES.map((route) => [route.id, route]));
function normalizeCmsPreviewRoutePath(path) {
    const trimmed = path.trim();
    if (!trimmed) {
        return "/";
    }
    const normalized = trimmed.replace(/\/+$/, "");
    return normalized.length > 0 ? normalized : "/";
}
function getCmsPreviewRouteById(id) {
    return ROUTE_BY_ID.get(id) ?? null;
}
function getCmsPreviewRouteByPageSlug(slug) {
    const normalizedSlug = slug?.trim().toLowerCase();
    if (!normalizedSlug) {
        return null;
    }
    return exports.CMS_PREVIEW_ROUTES.find((route) => route.pageSlug === normalizedSlug) ?? null;
}
function buildCmsPreviewRoutePath(routeId, locale, params) {
    const route = getCmsPreviewRouteById(routeId);
    if (!route) {
        return null;
    }
    if (route.dynamicParam === "slug") {
        const slug = params?.slug?.trim();
        if (!slug) {
            return null;
        }
        return normalizeCmsPreviewRoutePath(route.template
            .replace("[locale]", locale)
            .replace("[slug]", slug));
    }
    return normalizeCmsPreviewRoutePath(route.template.replace("[locale]", locale));
}
function matchCmsPreviewRoute(path) {
    const normalizedPath = normalizeCmsPreviewRoutePath(path);
    for (const route of exports.CMS_PREVIEW_ROUTES) {
        const escaped = route.template
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            .replace("\\[locale\\]", "(en|hi|mr)");
        const pattern = route.dynamicParam === "slug"
            ? `^${escaped.replace("\\[slug\\]", "([^/]+)")}$`
            : `^${escaped}$`;
        const match = normalizedPath.match(new RegExp(pattern));
        if (!match) {
            continue;
        }
        return {
            route,
            locale: match[1],
            params: route.dynamicParam === "slug"
                ? {
                    slug: match[2] ?? null,
                }
                : {},
        };
    }
    return null;
}
function getCmsPreviewRouteCandidates(input) {
    if (input.collection === "pages") {
        const route = getCmsPreviewRouteByPageSlug(input.slug);
        return route ? [{ id: route.id, label: route.label }] : [];
    }
    const routeIds = [];
    switch (input.collection) {
        case "blog":
            routeIds.push("blog", "blog-detail");
            break;
        case "faqs":
            routeIds.push("faq");
            break;
        case "testimonials":
            routeIds.push("home", "testimonials");
            break;
        case "gallery":
            routeIds.push("gallery");
            break;
        case "careers":
            routeIds.push("careers");
            break;
        case "clientLogos":
            routeIds.push("home");
            break;
        case "services":
            routeIds.push("home");
            break;
        case "eventTypes":
        case "cuisines":
            routeIds.push("events");
            break;
        case "pricing":
            routeIds.push("corporate", "events");
            break;
    }
    return routeIds
        .map((id) => getCmsPreviewRouteById(id))
        .filter((route) => route !== null)
        .map((route) => ({ id: route.id, label: route.label }));
}
