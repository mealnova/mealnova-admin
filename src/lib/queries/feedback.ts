import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFeedback, updateFeedbackStatus } from "@/lib/api";

export const feedbackKeys = {
  all: ['feedback'] as const,
};

export function useFeedback() {
  return useQuery({
    queryKey: feedbackKeys.all,
    queryFn: () => getFeedback(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useUpdateFeedbackStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateFeedbackStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: feedbackKeys.all }),
  });
}
