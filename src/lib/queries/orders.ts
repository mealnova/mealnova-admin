import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrders, getOrder, updateOrderStatus, initiateRefund } from "@/lib/api";

export const orderKeys = {
  all: ['orders'] as const,
  list: (params?: Record<string, unknown>) => [...orderKeys.all, params] as const,
};

export function useOrders(params?: { locationId?: string; status?: string }) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => getOrders(params),
    staleTime: 30 * 1000, // 30s — orders refresh frequently
    refetchInterval: 60 * 1000,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateOrderStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

export function useOrderDetail(id: string | null) {
  return useQuery({
    queryKey: ["order-detail", id],
    queryFn: () => getOrder(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useInitiateRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, amount }: { paymentId: string; amount?: number }) =>
      initiateRefund(paymentId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-detail"] });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}
