import { UploadResult } from "../../lib/api/endpoints";

export type QueueStatus = "pending" | "uploading" | "success" | "error";

export interface QueueItem {
  id: string;
  file: File;
  relativePath: string;
  size: number;
  status: QueueStatus;
  result?: UploadResult;
  error?: string;
}

export interface SessionStats {
  count: number;
  original: number;
  stored: number;
  savings: number;
}
