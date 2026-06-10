import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCmsItem,
  deleteCmsItem,
  updateCmsItem,
} from "@/lib/cms-api";
import {
  createContentPage,
  deleteContentPage,
  getContentPages,
  updateContentPage,
  type ApiContentPage,
  type CmsWorkflowStatus,
  type ContentPagePayload,
} from "@/lib/api";

// ── Base fetcher ─────────────────────────────────────────────────────────────

const API = "/api/admin";

async function cmsGet<T>(path: string): Promise<T[]> {
  const res = await fetch(`${API}${path}`, {
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || `Failed to load ${path}`);
  }

  const json = await res.json();
  const payload = json.data;
  return Array.isArray(payload) ? payload : payload?.data ?? [];
}

// ── Query keys ───────────────────────────────────────────────────────────────

export const contentKeys = {
  pages:        ["content", "pages"]        as const,
  gallery:      ["content", "gallery"]      as const,
  blog:         ["content", "blog"]         as const,
  faqs:         ["content", "faqs"]         as const,
  testimonials: ["content", "testimonials"] as const,
  careers:      ["content", "careers"]      as const,
  clientLogos:  ["content", "client-logos"] as const,
  services:     ["content", "services"]     as const,
  eventTypes:   ["content", "event-types"]  as const,
  cuisines:     ["content", "cuisines"]     as const,
  pricing:      ["content", "pricing"]      as const,
};

// ── Interfaces ───────────────────────────────────────────────────────────────

export interface GalleryItem {
  id: string | number;
  title: string;
  imageUrl?: string | null;
  primaryAssetId?: string | null;
  category?: string;
  categoryTermId?: string | null;
  isFeatured?: boolean;
  isPublished?: boolean;
  status?: CmsWorkflowStatus;
  sortOrder?: number;
}

export type ContentPage = ApiContentPage;
export type ContentPageInput = ContentPagePayload;

export interface BlogPost {
  id: string | number;
  slug: string;
  titleEn: string;
  excerptEn?: string;
  contentEn?: string;
  imageUrl?: string | null;
  primaryAssetId?: string | null;
  category?: string;
  categoryTermId?: string | null;
  tags?: string[];
  author?: string;
  isPublished?: boolean;
  status?: CmsWorkflowStatus;
  publishedAt?: string | null;
}

export interface Faq {
  id: string | number;
  questionEn: string;
  questionHi?: string | null;
  questionMr?: string | null;
  answerEn: string;
  answerHi?: string | null;
  answerMr?: string | null;
  category?: string | null;
  categoryTermId?: string | null;
  sortOrder?: number;
  isPublished?: boolean;
  status?: CmsWorkflowStatus;
  publishedAt?: string | null;
}

export interface Testimonial {
  id: string | number;
  name: string;
  role?: string | null;
  company?: string | null;
  rating?: number;
  text: string;
  imageUrl?: string | null;
  primaryAssetId?: string | null;
  isPublished?: boolean;
  status?: CmsWorkflowStatus;
  sortOrder?: number;
  publishedAt?: string | null;
}

export interface Career {
  id: string | number;
  title: string;
  department?: string | null;
  employmentType?: string | null;
  location?: string | null;
  description?: string | null;
  requirements?: string[];
  benefits?: string[];
  isActive?: boolean;
  status?: CmsWorkflowStatus;
  publishedAt?: string | null;
  applicationDeadline?: string | Date | null;
  createdAt?: string;
}

export interface ClientLogo {
  id: string | number;
  name: string;
  imageUrl?: string | null;
  primaryAssetId?: string | null;
  website?: string | null;
  isActive?: boolean;
  status?: CmsWorkflowStatus;
  publishedAt?: string | null;
  sortOrder?: number;
}

export interface Service {
  id: string | number;
  title: string;
  description?: string | null;
  icon?: string | null;
  features?: string[];
  ctaText?: string | null;
  ctaLink?: string | null;
  colorTheme?: string;
  sortOrder?: number;
  isActive?: boolean;
  status?: CmsWorkflowStatus;
  publishedAt?: string | null;
}

export interface EventType {
  id: string | number;
  name: string;
  description?: string | null;
  icon?: string | null;
  imageUrl?: string | null;
  primaryAssetId?: string | null;
  minGuests?: number | null;
  maxGuests?: number | null;
  priceRange?: string | null;
  isActive?: boolean;
  status?: CmsWorkflowStatus;
  publishedAt?: string | null;
  sortOrder?: number;
}

export interface CuisineOption {
  id: string | number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  primaryAssetId?: string | null;
  pricePerPlate?: number | null;
  isLiveCounter?: boolean;
  isActive?: boolean;
  status?: CmsWorkflowStatus;
  publishedAt?: string | null;
  sortOrder?: number;
}

export interface PricingTier {
  id: string | number;
  name: string;
  description?: string | null;
  price?: string;
  features?: string[];
  isPopular?: boolean;
  category?: string | null;
  categoryTermId?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  status?: CmsWorkflowStatus;
  publishedAt?: string | null;
}

// ── Page hooks ───────────────────────────────────────────────────────────────

export function usePages() {
  return useQuery({
    queryKey: contentKeys.pages,
    queryFn: () => getContentPages(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ContentPageInput) => createContentPage(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.pages }),
  });
}

export function useUpdatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContentPageInput> }) =>
      updateContentPage(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.pages }),
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteContentPage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.pages }),
  });
}

// ── Gallery hooks ─────────────────────────────────────────────────────────────

export function useGallery() {
  return useQuery({
    queryKey: contentKeys.gallery,
    queryFn: () => cmsGet<GalleryItem>("/cms-platform/admin/gallery"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateGalleryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<GalleryItem, "id">) =>
      createCmsItem<GalleryItem>("gallery", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.gallery }),
  });
}

export function useUpdateGalleryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<GalleryItem> }) =>
      updateCmsItem<GalleryItem>("gallery", id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.gallery }),
  });
}

export function useDeleteGalleryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => deleteCmsItem("gallery", id),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.gallery }),
  });
}

// ── Blog hooks ────────────────────────────────────────────────────────────────

export function useBlogPosts() {
  return useQuery({
    queryKey: contentKeys.blog,
    queryFn: () => cmsGet<BlogPost>("/cms-platform/admin/blog"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<BlogPost, "id">) =>
      createCmsItem<BlogPost>("blog_posts", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.blog }),
  });
}

export function useUpdateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<BlogPost> }) =>
      updateCmsItem<BlogPost>("blog_posts", id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.blog }),
  });
}

export function useDeleteBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => deleteCmsItem("blog_posts", id),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.blog }),
  });
}

// ── FAQ hooks ─────────────────────────────────────────────────────────────────

export function useFaqs() {
  return useQuery({
    queryKey: contentKeys.faqs,
    queryFn: () => cmsGet<Faq>("/cms-platform/admin/faqs"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Faq, "id">) =>
      createCmsItem<Faq>("faqs", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.faqs }),
  });
}

export function useUpdateFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<Faq> }) =>
      updateCmsItem<Faq>("faqs", id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.faqs }),
  });
}

export function useDeleteFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => deleteCmsItem("faqs", id),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.faqs }),
  });
}

// ── Testimonial hooks ─────────────────────────────────────────────────────────

export function useTestimonials() {
  return useQuery({
    queryKey: contentKeys.testimonials,
    queryFn: () => cmsGet<Testimonial>("/cms-platform/admin/testimonials"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTestimonial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Testimonial, "id">) =>
      createCmsItem<Testimonial>("testimonials", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.testimonials }),
  });
}

export function useUpdateTestimonial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<Testimonial> }) =>
      updateCmsItem<Testimonial>("testimonials", id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.testimonials }),
  });
}

export function useDeleteTestimonial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => deleteCmsItem("testimonials", id),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.testimonials }),
  });
}

// ── Career hooks ──────────────────────────────────────────────────────────────

export function useCareers() {
  return useQuery({
    queryKey: contentKeys.careers,
    queryFn: () => cmsGet<Career>("/cms-platform/admin/careers"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCareer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Career, "id">) =>
      createCmsItem<Career>("careers", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.careers }),
  });
}

export function useUpdateCareer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<Career> }) =>
      updateCmsItem<Career>("careers", id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.careers }),
  });
}

export function useDeleteCareer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => deleteCmsItem("careers", id),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.careers }),
  });
}

// ── Client logo hooks ─────────────────────────────────────────────────────────

export function useClientLogos() {
  return useQuery({
    queryKey: contentKeys.clientLogos,
    queryFn: () => cmsGet<ClientLogo>("/cms-platform/admin/client-logos"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateClientLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<ClientLogo, "id">) =>
      createCmsItem<ClientLogo>("client_logos", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.clientLogos }),
  });
}

export function useUpdateClientLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<ClientLogo> }) =>
      updateCmsItem<ClientLogo>("client_logos", id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.clientLogos }),
  });
}

export function useDeleteClientLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => deleteCmsItem("client_logos", id),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.clientLogos }),
  });
}

// ── Service hooks ─────────────────────────────────────────────────────────────

export function useServices() {
  return useQuery({
    queryKey: contentKeys.services,
    queryFn: () => cmsGet<Service>("/cms-platform/admin/services"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Service, "id">) =>
      createCmsItem<Service>("services", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.services }),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<Service> }) =>
      updateCmsItem<Service>("services", id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.services }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => deleteCmsItem("services", id),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.services }),
  });
}

// ── Event type hooks ──────────────────────────────────────────────────────────

export function useEventTypes() {
  return useQuery({
    queryKey: contentKeys.eventTypes,
    queryFn: () => cmsGet<EventType>("/cms-platform/admin/event-types"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateEventType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<EventType, "id">) =>
      createCmsItem<EventType>("event_types", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.eventTypes }),
  });
}

export function useUpdateEventType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<EventType> }) =>
      updateCmsItem<EventType>("event_types", id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.eventTypes }),
  });
}

export function useDeleteEventType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => deleteCmsItem("event_types", id),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.eventTypes }),
  });
}

// ── Cuisine hooks ─────────────────────────────────────────────────────────────

export function useCuisines() {
  return useQuery({
    queryKey: contentKeys.cuisines,
    queryFn: () => cmsGet<CuisineOption>("/cms-platform/admin/cuisines"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCuisine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CuisineOption, "id">) =>
      createCmsItem<CuisineOption>("cuisine_options", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.cuisines }),
  });
}

export function useUpdateCuisine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<CuisineOption> }) =>
      updateCmsItem<CuisineOption>("cuisine_options", id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.cuisines }),
  });
}

export function useDeleteCuisine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => deleteCmsItem("cuisine_options", id),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.cuisines }),
  });
}

// ── Pricing tier hooks ────────────────────────────────────────────────────────

export function usePricingTiers() {
  return useQuery({
    queryKey: contentKeys.pricing,
    queryFn: () => cmsGet<PricingTier>("/cms-platform/admin/pricing"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePricingTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<PricingTier, "id">) =>
      createCmsItem<PricingTier>("pricing_tiers", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.pricing }),
  });
}

export function useUpdatePricingTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<PricingTier> }) =>
      updateCmsItem<PricingTier>("pricing_tiers", id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.pricing }),
  });
}

export function useDeletePricingTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => deleteCmsItem("pricing_tiers", id),
    onSuccess: () => qc.invalidateQueries({ queryKey: contentKeys.pricing }),
  });
}
