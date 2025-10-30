import { useAuthQuery as useQuery } from "../../hooks/useAuthQuery";
import { fetchObjectMetadata } from "../../lib/api/endpoints";

export function useFile(bucket: string | null, key: string | null) {
  return useQuery({
    queryKey: ["meta", bucket, key] as const,
    queryFn: () => fetchObjectMetadata(bucket as string, key as string),
    enabled: Boolean(bucket && key),
    staleTime: 300_000,
  });
}
