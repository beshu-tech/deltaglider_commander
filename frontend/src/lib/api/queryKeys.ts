export const qk = {
  buckets: ["buckets"] as const,
  objects: (
    bucket: string,
    prefix: string,
    sort: string,
    order: string,
    limit: number,
    compressed: string,
    cursor?: string | null,
    search?: string | null,
  ) =>
    [
      "objects",
      bucket,
      prefix,
      sort,
      order,
      limit,
      compressed,
      cursor ?? null,
      search ?? null,
    ] as const,
  objectsFull: (bucket: string, prefix: string, search: string | undefined, compressed: string) =>
    ["objects-full", bucket, prefix, search ?? null, compressed] as const,
  metadata: (bucket: string, key: string) => ["meta", bucket, key] as const,
  statsSummary: (bucket?: string | null) => ["stats", "summary", bucket ?? "_all_"] as const,
} as const;
