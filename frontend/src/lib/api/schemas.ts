import { z } from "zod";

export const bucketSchema = z.object({
  name: z.string(),
  object_count: z.number().int().nonnegative(),
  original_bytes: z.number().int().nonnegative(),
  stored_bytes: z.number().int().nonnegative(),
  savings_pct: z.number(),
  pending: z.boolean().optional(),
});

export const bucketsResponseSchema = z.object({
  buckets: z.array(bucketSchema),
});

export const objectItemSchema = z.object({
  key: z.string(),
  original_bytes: z.number().int().nonnegative(),
  stored_bytes: z.number().int().nonnegative(),
  compressed: z.boolean(),
  modified: z.string(),
});

export const objectListSchema = z.object({
  objects: z.array(objectItemSchema),
  common_prefixes: z.array(z.string()),
  cursor: z.string().nullable().optional(),
});

export const fileMetadataSchema = z.object({
  key: z.string(),
  original_bytes: z.number().int().nonnegative(),
  stored_bytes: z.number().int().nonnegative(),
  compressed: z.boolean(),
  modified: z.string(),
  accept_ranges: z.boolean(),
  content_type: z.string().nullable().optional(),
  etag: z.string().nullable().optional(),
  metadata: z.record(z.string()).optional(),
});

export const downloadPrepareSchema = z.object({
  download_token: z.string(),
  estimated_bytes: z.number().int().nonnegative(),
});

export const uploadResultSchema = z.object({
  bucket: z.string(),
  key: z.string(),
  original_bytes: z.number().int().nonnegative(),
  stored_bytes: z.number().int().nonnegative(),
  compressed: z.boolean(),
  operation: z.string(),
  savings_bytes: z.number().int().nonnegative(),
  savings_pct: z.number(),
  physical_key: z.string().optional(),
  relative_path: z.string().optional(),
});

export const uploadStatsSchema = z.object({
  count: z.number().int().nonnegative(),
  original_bytes: z.number().int().nonnegative(),
  stored_bytes: z.number().int().nonnegative(),
  savings_bytes: z.number().int().nonnegative(),
  savings_pct: z.number(),
});

export const uploadResponseSchema = z.object({
  bucket: z.string(),
  prefix: z.string().optional().default(""),
  results: z.array(uploadResultSchema),
  stats: uploadStatsSchema,
});

const errorDetailsSchema = z.object({}).passthrough();

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: errorDetailsSchema.optional(),
  }),
});

export type Bucket = z.infer<typeof bucketSchema>;
export type ObjectItem = z.infer<typeof objectItemSchema>;
export type ObjectList = z.infer<typeof objectListSchema>;
export type FileMetadata = z.infer<typeof fileMetadataSchema>;
export type DownloadPrepare = z.infer<typeof downloadPrepareSchema>;
export type ApiErrorPayload = z.infer<typeof apiErrorSchema>;
export type UploadResult = z.infer<typeof uploadResultSchema>;
export type UploadStats = z.infer<typeof uploadStatsSchema>;
export type UploadResponse = z.infer<typeof uploadResponseSchema>;
