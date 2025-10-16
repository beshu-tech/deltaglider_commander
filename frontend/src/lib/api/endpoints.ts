import { ApiError } from "./client";
import { apiWithAuth } from "./authInterceptor";
import {
  Bucket,
  bucketStatsResponseSchema,
  DownloadPrepare,
  FileMetadata,
  ObjectList,
  bucketsResponseSchema,
  downloadPrepareSchema,
  fileMetadataSchema,
  objectListSchema,
  uploadResponseSchema,
  UploadResponse,
  UploadResult,
  refreshBucketStatsResponseSchema,
} from "./schemas";

// Re-export types from schemas
export type { UploadResponse, UploadResult };
export interface ObjectsParams {
  bucket: string;
  prefix?: string;
  search?: string;
  cursor?: string;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  compressed?: "true" | "false" | "any";
  fetchMetadata?: boolean;
}

export async function fetchBuckets(): Promise<Bucket[]> {
  const data = await apiWithAuth<{ buckets: unknown }>("/api/buckets/");
  const parsed = bucketsResponseSchema.parse(data);
  return parsed.buckets;
}

export type BucketStatsMode = "quick" | "sampled" | "detailed";

export async function fetchBucketStats(
  bucket: string,
  mode: BucketStatsMode = "sampled",
): Promise<Bucket> {
  const query = new URLSearchParams();
  if (mode) {
    query.set("mode", mode);
  }
  const data = await apiWithAuth<unknown>(
    `/api/buckets/${encodeURIComponent(bucket)}/stats?${query.toString()}`,
  );
  const parsed = bucketStatsResponseSchema.parse(data);
  return parsed.bucket;
}

export async function refreshBucketStats(mode: BucketStatsMode = "sampled"): Promise<Bucket[]> {
  const data = await apiWithAuth<unknown>("/api/buckets/cache/refresh", {
    method: "POST",
    body: JSON.stringify({ mode }),
  });
  const parsed = refreshBucketStatsResponseSchema.parse(data);
  return parsed.buckets;
}

export async function createBucket(name: string): Promise<void> {
  await apiWithAuth("/api/buckets/", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function deleteBucket(name: string): Promise<void> {
  await apiWithAuth(`/api/buckets/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export async function deleteObject(bucket: string, key: string): Promise<void> {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  await apiWithAuth(`/api/objects/${encodeURIComponent(bucket)}/${encodedKey}`, {
    method: "DELETE",
  });
}

export interface BulkDeleteResponse {
  deleted: string[];
  errors: Array<{ key: string; error: string }>;
  total_requested: number;
  total_deleted: number;
  total_errors: number;
}

export const BULK_DELETE_BATCH_SIZE = 5;

export interface BulkDeleteBatchEvent {
  batchIndex: number;
  batchCount: number;
  keys: string[];
  deleted: string[];
  errors: Array<{ key: string; error: string }>;
}

export interface BulkDeleteOptions {
  onBatchComplete?: (event: BulkDeleteBatchEvent) => void;
}

export async function bulkDeleteObjects(
  bucket: string,
  keys: string[],
  options: BulkDeleteOptions = {},
): Promise<BulkDeleteResponse> {
  if (keys.length === 0) {
    return {
      deleted: [],
      errors: [],
      total_requested: 0,
      total_deleted: 0,
      total_errors: 0,
    };
  }

  const aggregated: BulkDeleteResponse = {
    deleted: [],
    errors: [],
    total_requested: keys.length,
    total_deleted: 0,
    total_errors: 0,
  };

  const batchCount = Math.ceil(keys.length / BULK_DELETE_BATCH_SIZE);

  for (let index = 0; index < keys.length; index += BULK_DELETE_BATCH_SIZE) {
    const batchKeys = keys.slice(index, index + BULK_DELETE_BATCH_SIZE);
    const result = await apiWithAuth<BulkDeleteResponse>("/api/objects/bulk", {
      method: "DELETE",
      body: JSON.stringify({ bucket, keys: batchKeys }),
    });

    aggregated.deleted.push(...result.deleted);
    aggregated.errors.push(...result.errors);

    options.onBatchComplete?.({
      batchIndex: Math.floor(index / BULK_DELETE_BATCH_SIZE),
      batchCount,
      keys: batchKeys,
      deleted: result.deleted,
      errors: result.errors,
    });
  }

  aggregated.total_deleted = aggregated.deleted.length;
  aggregated.total_errors = aggregated.errors.length;

  return aggregated;
}

export async function fetchObjects(params: ObjectsParams): Promise<ObjectList> {
  const query = new URLSearchParams();
  query.set("bucket", params.bucket);
  if (params.prefix) query.set("prefix", params.prefix);
  if (params.search) query.set("search", params.search);
  if (params.cursor) query.set("cursor", params.cursor);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.sort) query.set("sort", params.sort);
  if (params.order) query.set("order", params.order);
  if (params.compressed && params.compressed !== "any") {
    query.set("compressed", params.compressed);
  }
  if (params.fetchMetadata !== undefined) {
    query.set("fetch_metadata", String(params.fetchMetadata));
  }
  const data = await apiWithAuth<unknown>(`/api/objects/?${query.toString()}`);
  return objectListSchema.parse(data);
}

export async function fetchObjectMetadata(bucket: string, key: string): Promise<FileMetadata> {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const data = await apiWithAuth<unknown>(
    `/api/objects/${encodeURIComponent(bucket)}/${encodedKey}/metadata`,
  );
  return fileMetadataSchema.parse(data);
}

export async function triggerSavings(bucket: string): Promise<void> {
  await apiWithAuth(`/api/buckets/${encodeURIComponent(bucket)}/compute-savings`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function prepareDownload(bucket: string, key: string): Promise<DownloadPrepare> {
  const data = await apiWithAuth<unknown>("/api/download/prepare", {
    method: "POST",
    body: JSON.stringify({ bucket, key }),
  });
  return downloadPrepareSchema.parse(data);
}

export async function fetchDownload(token: string): Promise<ArrayBuffer> {
  return apiWithAuth<ArrayBuffer>(`/api/download/${encodeURIComponent(token)}`, {
    timeoutMs: null,
    parseAs: "arrayBuffer",
  });
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export interface UploadFileInput {
  file: File;
  relativePath?: string;
}

export interface UploadObjectsParams {
  bucket: string;
  prefix?: string;
  files: UploadFileInput[];
}

export async function uploadObjects(params: UploadObjectsParams): Promise<UploadResponse> {
  const formData = new FormData();
  formData.set("bucket", params.bucket);
  if (params.prefix) {
    formData.set("prefix", params.prefix);
  }

  params.files.forEach((item) => {
    const fallbackName = item.file.name || "file";
    const relative =
      item.relativePath ||
      (item.file as File & { webkitRelativePath?: string }).webkitRelativePath ||
      fallbackName;
    const normalized = relative.replace(/^\/+/, "");
    formData.append("files", item.file, normalized || fallbackName);
  });

  const data = await apiWithAuth<unknown>("/api/upload/", {
    method: "POST",
    body: formData,
    timeoutMs: null, // Disable timeout for uploads (files can be large)
  });
  return uploadResponseSchema.parse(data);
}
