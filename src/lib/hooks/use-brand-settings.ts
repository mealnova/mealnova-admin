import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

export interface BrandSettingsMeta {
  siteName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  fssaiNumber: string;
  gstin: string;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  bankUpi: string;
}

export function useBrandSettings() {
  return useQuery({
    queryKey: ["brand-settings"],
    queryFn: () => apiGet<BrandSettingsMeta>("/content/brand-settings"),
    staleTime: 5 * 60 * 1000,
    // No credentials required — endpoint is @Public()
  });
}

/** Returns the first letter of each word in the site name, up to 2 chars. */
export function siteInitials(siteName: string): string {
  return siteName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
