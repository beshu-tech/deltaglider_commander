import { useQuery } from "@tanstack/react-query";
import { fetchObjects } from "../../lib/api/endpoints";
import { qk } from "../../lib/api/queryKeys";
import { ObjectList } from "./types";

export interface UseObjectsOptions {
  bucket: string;
  prefix?: string;
  search?: string;
  cursor?: string;
  sort: string;
  order: "asc" | "desc";
  limit: number;
  compressed?: "true" | "false" | "any";
}

export function useObjects({ bucket, prefix = "", search, cursor, sort, order, limit, compressed }: UseObjectsOptions) {
  return useQuery<ObjectList>({
    queryKey: qk.objects(bucket, prefix, sort, order, limit, compressed ?? "any", cursor, search),
    queryFn: () =>
      fetchObjects({
        bucket,
        prefix,
        search,
        cursor,
        sort,
        order,
        limit,
        compressed
      }),
    staleTime: 30_000
  });
}
