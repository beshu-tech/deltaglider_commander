import { ApiError } from "./client";
import { apiWithAuth } from "./authInterceptor";
import {
  Bucket,
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
}

export async function fetchBuckets(): Promise<Bucket[]> {
  const data = await apiWithAuth<{ buckets: unknown }>("/api/buckets/");
  const parsed = bucketsResponseSchema.parse(data);
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

export async function bulkDeleteObjects(
  bucket: string,
  keys: string[],
): Promise<BulkDeleteResponse> {
  const data = await apiWithAuth<BulkDeleteResponse>("/api/objects/bulk", {
    method: "DELETE",
    body: JSON.stringify({ bucket, keys }),
  });
  return data;
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
  });
  return uploadResponseSchema.parse(data);
}
