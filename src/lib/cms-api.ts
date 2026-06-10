const API = "/api/admin";
const REQUEST_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS || 20000);

function buildAdminFetchError(path: string, detail: string) {
  return new Error(`Admin CMS request failed for ${path}: ${detail}`);
}

function extractArrayPayload<T>(path: string, json: unknown): T[] {
  if (!json || typeof json !== "object") {
    throw buildAdminFetchError(path, "invalid JSON payload");
  }

  const payload = (json as { data?: unknown }).data;
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data;
  }

  throw buildAdminFetchError(path, "invalid collection payload");
}

async function apiGet<T>(path: string): Promise<T[]> {
  try {
    const res = await fetch(`${API}${path}`, {
      cache: "no-store",
      credentials: "include",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      const detail = `upstream returned ${res.status} ${res.statusText}`;
      throw buildAdminFetchError(path, detail);
    }

    const json = await res.json();
    return extractArrayPayload<T>(path, json);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Admin CMS request failed for")) {
      throw error;
    }

    const detail =
      error instanceof Error && error.name === "AbortError"
        ? `request timed out after ${REQUEST_TIMEOUT_MS}ms`
        : error instanceof Error
          ? error.message
          : "request failed";
    throw buildAdminFetchError(path, detail);
  }
}

export interface DCategory {
  id: string | number;
  name: string;
  slug: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface DMenuItem {
  id: string | number;
  name: string;
  nameHi?: string;
  slug: string;
  description?: string;
  basePrice?: string | number;
  price?: string | number;
  isJain?: boolean;
  isVegan?: boolean;
  isAvailable?: boolean;
  sortOrder?: number;
  isPublished?: boolean;
  category?: { id: string | number; name: string; slug: string } | null;
}

export interface DLocation {
  id: string | number;
  name: string;
  slug: string;
  type?: string;
  address?: string;
  city?: string;
  pincode?: string;
  contactPhone?: string;
  contactPerson?: string;
  dailyCapacity?: number;
  isActive?: boolean;
  isRestricted?: boolean;
  openTime?: string;
  closeTime?: string;
  fssaiLicense?: string;
}

export interface AdminMenuItem {
  id: string;
  name: string;
  nameHi?: string;
  description?: string;
  category: string;
  categorySlug: string;
  price: number;
  isJain: boolean;
  isVegan: boolean;
  available: boolean;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
}

export interface AdminLocation {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  capacity: number;
  status: "active" | "inactive";
  contactPhone: string;
  fssaiLicense?: string;
}

function toMenuItem(d: DMenuItem): AdminMenuItem {
  return {
    id: String(d.id),
    name: d.name,
    nameHi: d.nameHi,
    description: d.description,
    category: d.category?.name ?? "Uncategorised",
    categorySlug: d.category?.slug ?? "",
    price: Number(d.basePrice ?? d.price ?? 0),
    isJain: d.isJain ?? false,
    isVegan: d.isVegan ?? false,
    available: d.isAvailable !== false,
  };
}

function toCategory(d: DCategory): AdminCategory {
  return { id: String(d.id), name: d.name, slug: d.slug };
}

function toLocation(d: DLocation): AdminLocation {
  return {
    id: String(d.id),
    name: d.name,
    type: d.type ?? "corporate",
    address: d.address ?? "Pune",
    city: d.city ?? "Pune",
    capacity: d.dailyCapacity ?? 0,
    status: d.isActive !== false ? "active" : "inactive",
    contactPhone: d.contactPhone ?? "—",
    fssaiLicense: d.fssaiLicense,
  };
}

export async function fetchAdminMenuItems(): Promise<AdminMenuItem[]> {
  const raw = await apiGet<DMenuItem>("/menu/items?pageSize=1000");
  return raw.map(toMenuItem);
}

export async function fetchAdminCategories(): Promise<AdminCategory[]> {
  const raw = await apiGet<DCategory>("/menu/categories");
  return raw.map(toCategory);
}

export async function fetchAdminLocations(): Promise<AdminLocation[]> {
  const raw = await apiGet<DLocation>("/locations");
  return raw.map(toLocation);
}

const CMS_ROUTES: Record<string, string> = {
  menu_items: "/menu/items",
  menu_categories: "/menu/categories",
  locations: "/locations",
  gallery: "/cms-platform/admin/gallery",
  blog_posts: "/cms-platform/admin/blog",
  faqs: "/cms-platform/admin/faqs",
  testimonials: "/cms-platform/admin/testimonials",
  careers: "/cms-platform/admin/careers",
  client_logos: "/cms-platform/admin/client-logos",
  services: "/cms-platform/admin/services",
  event_types: "/cms-platform/admin/event-types",
  cuisine_options: "/cms-platform/admin/cuisines",
  pricing_tiers: "/cms-platform/admin/pricing",
};

export async function createCmsItem<T>(collection: string, data: unknown): Promise<T> {
  const path = CMS_ROUTES[collection];
  if (!path) throw new Error(`Unknown collection: ${collection}`);
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string })?.message ?? `Failed to create ${collection}`);
  }
  const json = await res.json();
  return json.data as T;
}

export async function updateCmsItem<T>(
  collection: string,
  id: string | number,
  data: unknown,
): Promise<T> {
  const path = CMS_ROUTES[collection];
  if (!path) throw new Error(`Unknown collection: ${collection}`);
  const res = await fetch(`${API}${path}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string })?.message ?? `Failed to update ${collection}`);
  }
  const json = await res.json();
  return json.data as T;
}

export async function deleteCmsItem(collection: string, id: string | number): Promise<void> {
  const path = CMS_ROUTES[collection];
  if (!path) throw new Error(`Unknown collection: ${collection}`);
  const res = await fetch(`${API}${path}/${id}`, {
    method: "DELETE",
    credentials: "include",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Failed to delete from ${collection}`);
}
