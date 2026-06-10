import type { CmsWorkflowStatus } from "@/lib/api";
import { deriveWorkflowStatus } from "@/lib/queries/cms-foundation";

export function deriveEditorWorkflowStatus(input: {
  status?: CmsWorkflowStatus | null;
  isPublished?: boolean | null;
  isActive?: boolean | null;
  publishedAt?: string | null;
}): CmsWorkflowStatus {
  return deriveWorkflowStatus({
    status: input.status ?? null,
    isPublished: input.isPublished ?? input.isActive ?? false,
    publishedAt: input.publishedAt ?? null,
  });
}

export function getWorkflowStatusMeta(status: CmsWorkflowStatus) {
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
