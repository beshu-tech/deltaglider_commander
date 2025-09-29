export const qk = {
  buckets: ["buckets"] as const,
  objects: (
    bucket: string,
    prefix: string,
    sort: string,
    order: string,
    limit: number,
    compressed: string,
    cursor?: string | null
  ) => ["objects", bucket, prefix, sort, order, limit, compressed, cursor ?? null] as const,
  metadata: (bucket: string, key: string) => ["meta", bucket, key] as const,
  statsSummary: (bucket?: string | null) => ["stats", "summary", bucket ?? "_all_"] as const
} as const;
