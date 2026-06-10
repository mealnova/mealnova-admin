import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMenuItems, getMenuCategories, createMenuItem, updateMenuItem, toggleMenuItemAvailability, ApiMenuItem, CreateMenuItemPayload } from "@/lib/api";

export const menuKeys = {
  all: ['menu'] as const,
  items: (locationId?: string, categoryId?: string) => [...menuKeys.all, 'items', locationId, categoryId] as const,
  categories: () => [...menuKeys.all, 'categories'] as const,
};

export function useMenuItems(params?: { locationId?: string; categoryId?: string; search?: string }) {
  return useQuery({
    queryKey: menuKeys.items(params?.locationId, params?.categoryId),
    queryFn: () => getMenuItems(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useMenuCategories() {
  return useQuery({
    queryKey: menuKeys.categories(),
    queryFn: () => getMenuCategories(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createMenuItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: menuKeys.all }),
  });
}

export function useUpdateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateMenuItemPayload> }) => updateMenuItem(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: menuKeys.all }),
  });
}

export function useToggleAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      toggleMenuItemAvailability(id, isAvailable),
    onSuccess: () => qc.invalidateQueries({ queryKey: menuKeys.all }),
  });
}
