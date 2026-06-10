import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLocations, updateLocation } from "@/lib/api";

export const locationKeys = {
  all: ['locations'] as const,
};

export function useLocations() {
  return useQuery({
    queryKey: locationKeys.all,
    queryFn: () => getLocations(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => updateLocation(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: locationKeys.all }),
  });
}
