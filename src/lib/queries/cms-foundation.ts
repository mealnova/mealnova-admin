import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCmsTaxonomyTerm,
  createCmsEntryPreviewLink,
  createExternalCmsAsset,
  getCmsAssets,
  getCmsCollectionSchema,
  getCmsCollectionSchemas,
  getCmsEntryPreviewLinks,
  getCmsEntryPreviewRoutes,
  getCmsEntryRevision,
  getCmsEntryRevisions,
  getCmsEntryReviewEvents,
  getCmsTaxonomies,
  getCmsTaxonomyTerms,
  revokeCmsPreviewLink,
  restoreCmsEntryRevision,
  updateCmsAsset,
  updateCmsEntryStatus,
  updateCmsTaxonomyTerm,
  uploadCmsAsset,
  type CmsAsset,
  type CmsCollectionSchema,
  type CmsFoundationCollection,
  type CmsRevision,
  type CmsTaxonomy,
  type CmsTaxonomyTerm,
  type CmsWorkflowStatus,
} from "@/lib/api";

export const cmsFoundationKeys = {
  schemas: ["cms-foundation", "schemas"] as const,
  schema: (collection: CmsFoundationCollection) =>
    ["cms-foundation", "schema", collection] as const,
  taxonomies: ["cms-foundation", "taxonomies"] as const,
  taxonomyTerms: (taxonomyKey: string) =>
    ["cms-foundation", "taxonomy-terms", taxonomyKey] as const,
  assets: (input: { limit?: number; q?: string; source?: "UPLOAD" | "EXTERNAL" }) =>
    ["cms-foundation", "assets", input.limit ?? 200, input.q ?? "", input.source ?? "ALL"] as const,
  revisions: (collection: CmsFoundationCollection, id: string) =>
    ["cms-foundation", "revisions", collection, id] as const,
  revision: (collection: CmsFoundationCollection, id: string, revisionId: string) =>
    ["cms-foundation", "revision", collection, id, revisionId] as const,
  reviewEvents: (collection: CmsFoundationCollection, id: string) =>
    ["cms-foundation", "review-events", collection, id] as const,
  previewRoutes: (collection: CmsFoundationCollection, id: string, locale: string) =>
    ["cms-foundation", "preview-routes", collection, id, locale] as const,
  previewLinks: (collection: CmsFoundationCollection, id: string) =>
    ["cms-foundation", "preview-links", collection, id] as const,
};

export function useCmsCollectionSchemas() {
  return useQuery({
    queryKey: cmsFoundationKeys.schemas,
    queryFn: () => getCmsCollectionSchemas(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCmsCollectionSchema(collection: CmsFoundationCollection) {
  return useQuery({
    queryKey: cmsFoundationKeys.schema(collection),
    queryFn: () => getCmsCollectionSchema(collection),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCmsTaxonomies() {
  return useQuery({
    queryKey: cmsFoundationKeys.taxonomies,
    queryFn: () => getCmsTaxonomies(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCmsTaxonomyTerms(taxonomyKey: string) {
  return useQuery({
    queryKey: cmsFoundationKeys.taxonomyTerms(taxonomyKey),
    queryFn: () => getCmsTaxonomyTerms(taxonomyKey),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(taxonomyKey),
  });
}

export function useCreateCmsTaxonomyTerm(taxonomyKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      slug?: string;
      label?: string;
      description?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    }) => createCmsTaxonomyTerm(taxonomyKey, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cmsFoundationKeys.taxonomies });
      qc.invalidateQueries({ queryKey: cmsFoundationKeys.taxonomyTerms(taxonomyKey) });
    },
  });
}

export function useUpdateCmsTaxonomyTerm(taxonomyKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ termId, body }: { termId: string; body: {
      slug?: string;
      label?: string;
      description?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    } }) => updateCmsTaxonomyTerm(termId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cmsFoundationKeys.taxonomies });
      qc.invalidateQueries({ queryKey: cmsFoundationKeys.taxonomyTerms(taxonomyKey) });
    },
  });
}

export function useCmsAssets(
  input: number | { limit?: number; q?: string; source?: "UPLOAD" | "EXTERNAL" } = 200,
) {
  const options = typeof input === "number" ? { limit: input } : input;
  return useQuery({
    queryKey: cmsFoundationKeys.assets(options),
    queryFn: () => getCmsAssets(options),
    staleTime: 60 * 1000,
  });
}

export function useCreateExternalCmsAsset(
  input: number | { limit?: number; q?: string; source?: "UPLOAD" | "EXTERNAL" } = 200,
) {
  const options = typeof input === "number" ? { limit: input } : input;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      publicUrl: string;
      title?: string | null;
      altText?: string | null;
    }) => createExternalCmsAsset(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cmsFoundationKeys.assets(options) });
    },
  });
}

export function useUploadCmsAsset(
  input: number | { limit?: number; q?: string; source?: "UPLOAD" | "EXTERNAL" } = 200,
) {
  const options = typeof input === "number" ? { limit: input } : input;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      file: File;
      title?: string | null;
      altText?: string | null;
    }) => uploadCmsAsset(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cmsFoundationKeys.assets(options) });
    },
  });
}

export function useUpdateCmsAsset(
  input: number | { limit?: number; q?: string; source?: "UPLOAD" | "EXTERNAL" } = 200,
) {
  const options = typeof input === "number" ? { limit: input } : input;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: {
      publicUrl?: string;
      title?: string | null;
      altText?: string | null;
    } }) => updateCmsAsset(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cmsFoundationKeys.assets(options) });
    },
  });
}

export function useCmsEntryRevisions(collection: CmsFoundationCollection, id?: string | null) {
  return useQuery({
    queryKey: cmsFoundationKeys.revisions(collection, id ?? "new"),
    queryFn: () => getCmsEntryRevisions(collection, id!),
    staleTime: 30 * 1000,
    enabled: Boolean(id),
  });
}

export function useCmsEntryRevision(
  collection: CmsFoundationCollection,
  id?: string | null,
  revisionId?: string | null,
) {
  return useQuery({
    queryKey: cmsFoundationKeys.revision(collection, id ?? "new", revisionId ?? "latest"),
    queryFn: () => getCmsEntryRevision(collection, id!, revisionId!),
    staleTime: 30 * 1000,
    enabled: Boolean(id && revisionId),
  });
}

export function useCmsEntryReviewEvents(collection: CmsFoundationCollection, id?: string | null) {
  return useQuery({
    queryKey: cmsFoundationKeys.reviewEvents(collection, id ?? "new"),
    queryFn: () => getCmsEntryReviewEvents(collection, id!),
    staleTime: 10 * 1000,
    enabled: Boolean(id),
  });
}

export function useCmsEntryPreviewRoutes(
  collection: CmsFoundationCollection,
  id?: string | null,
  locale = "en",
) {
  return useQuery({
    queryKey: cmsFoundationKeys.previewRoutes(collection, id ?? "new", locale),
    queryFn: () => getCmsEntryPreviewRoutes(collection, id!, locale),
    staleTime: 30 * 1000,
    enabled: Boolean(id),
  });
}

export function useCmsEntryPreviewLinks(collection: CmsFoundationCollection, id?: string | null) {
  return useQuery({
    queryKey: cmsFoundationKeys.previewLinks(collection, id ?? "new"),
    queryFn: () => getCmsEntryPreviewLinks(collection, id!),
    staleTime: 10 * 1000,
    enabled: Boolean(id),
  });
}

export function useRestoreCmsEntryRevision(collection: CmsFoundationCollection, id?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (revisionId: string) => restoreCmsEntryRevision(collection, id!, revisionId),
    onSuccess: () => {
      if (id) {
        qc.invalidateQueries({ queryKey: cmsFoundationKeys.revisions(collection, id) });
        qc.invalidateQueries({ queryKey: cmsFoundationKeys.reviewEvents(collection, id) });
      }
    },
  });
}

export function useUpdateCmsEntryStatus(collection: CmsFoundationCollection, id?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { status: CmsWorkflowStatus; publishedAt?: string | null; note?: string | null }) =>
      updateCmsEntryStatus(collection, id!, body),
    onSuccess: () => {
      if (id) {
        qc.invalidateQueries({ queryKey: cmsFoundationKeys.revisions(collection, id) });
        qc.invalidateQueries({ queryKey: cmsFoundationKeys.reviewEvents(collection, id) });
      }
    },
  });
}

export function useCreateCmsEntryPreviewLink(collection: CmsFoundationCollection, id?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: {
      routePath?: string;
      locale?: string;
      expiresInHours?: number;
    }) => createCmsEntryPreviewLink(collection, id!, body),
    onSuccess: () => {
      if (id) {
        qc.invalidateQueries({ queryKey: cmsFoundationKeys.previewLinks(collection, id) });
      }
    },
  });
}

export function useRevokeCmsPreviewLink(collection: CmsFoundationCollection, id?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (previewLinkId: string) => revokeCmsPreviewLink(previewLinkId),
    onSuccess: () => {
      if (id) {
        qc.invalidateQueries({ queryKey: cmsFoundationKeys.previewLinks(collection, id) });
      }
    },
  });
}

export function findCmsTaxonomy(
  taxonomies: CmsTaxonomy[] | undefined,
  taxonomyKey: string,
) {
  return taxonomies?.find((taxonomy) => taxonomy.key === taxonomyKey) ?? null;
}

export function findCmsAsset(
  assets: CmsAsset[] | undefined,
  input: { assetId?: string | null; imageUrl?: string | null },
) {
  if (!assets?.length) {
    return null;
  }

  if (input.assetId) {
    return assets.find((asset) => asset.id === input.assetId) ?? null;
  }

  const normalizedImageUrl = input.imageUrl?.trim();
  if (!normalizedImageUrl) {
    return null;
  }

  return assets.find((asset) => asset.publicUrl === normalizedImageUrl) ?? null;
}

export function deriveWorkflowStatus(input: {
  status?: CmsWorkflowStatus | null;
  isPublished?: boolean | null;
  publishedAt?: string | null;
}): CmsWorkflowStatus {
  if (input.status) {
    return input.status;
  }

  if (!input.isPublished) {
    return "DRAFT";
  }

  if (input.publishedAt && new Date(input.publishedAt).getTime() > Date.now()) {
    return "SCHEDULED";
  }

  return "PUBLISHED";
}

export function canScheduleStatus(status: CmsWorkflowStatus) {
  return status === "SCHEDULED";
}

export function isPublicWorkflowStatus(status: CmsWorkflowStatus) {
  return status === "PUBLISHED" || status === "SCHEDULED";
}

export function workflowStatusLabel(status: CmsWorkflowStatus) {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "IN_REVIEW":
      return "In Review";
    case "SCHEDULED":
      return "Scheduled";
    case "PUBLISHED":
      return "Published";
    case "ARCHIVED":
      return "Archived";
  }
}
