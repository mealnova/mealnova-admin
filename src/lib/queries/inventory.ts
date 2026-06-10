import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInventory, adjustStock } from "@/lib/api";

export const inventoryKeys = {
  all: ['inventory'] as const,
};

export function useInventory() {
  return useQuery({
    queryKey: inventoryKeys.all,
    queryFn: () => getInventory(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, delta }: { id: string; delta: number }) => adjustStock(id, delta),
    onSuccess: () => qc.invalidateQueries({ queryKey: inventoryKeys.all }),
  });
}
