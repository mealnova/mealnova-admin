import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCorporateAccounts, createCorporateAccount, updateCorporateAccount } from "@/lib/api";

export const accountKeys = {
  all: ['accounts'] as const,
};

export function useCorporateAccounts() {
  return useQuery({
    queryKey: accountKeys.all,
    queryFn: () => getCorporateAccounts(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateCorporateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCorporateAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.all }),
  });
}

export function useUpdateCorporateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateCorporateAccount(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.all }),
  });
}
