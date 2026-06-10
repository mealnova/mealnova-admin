import { useQuery } from "@tanstack/react-query";
import { getEmployees } from "@/lib/api";

export const employeeKeys = {
  all: ['employees'] as const,
};

export function useEmployees() {
  return useQuery({
    queryKey: employeeKeys.all,
    queryFn: () => getEmployees(),
    staleTime: 5 * 60 * 1000,
  });
}
