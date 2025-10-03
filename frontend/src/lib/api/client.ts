import { getApiUrl } from "../config/env";
import { ApiErrorPayload, apiErrorSchema } from "./schemas";

export interface ApiRequestOptions extends RequestInit {
  timeoutMs?: number | null;
  parseAs?: "json" | "arrayBuffer" | "text";
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly details?: unknown;
  public readonly status?: number;

  constructor(payload: { code: string; message: string; details?: unknown; status?: number }) {
    super(payload.message);
    this.name = "ApiError";
    this.code = payload.code;
    this.details = payload.details;
    this.status = payload.status;
  }
}

/**
 * Extract user-friendly error message from an error object.
 * For ApiError, prefers details.reason over the generic message.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.details && typeof error.details === 'object') {
    const details = error.details as Record<string, any>;
    if (details.reason && typeof details.reason === 'string') {
      return details.reason;
    }
  }
  return String(error);
}

async function parseError(response: Response): Promise<ApiErrorPayload> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const data = await response.json();
      return apiErrorSchema.parse(data);
    } catch (error) {
      return { error: { code: "invalid_error_payload", message: "Invalid error payload" } };
    }
  }
  const message = await response.text();
  return { error: { code: "http_error", message: message || response.statusText } };
}

export async function api<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { timeoutMs = 30_000, parseAs = "json", signal, headers, body, method, ...rest } = options;
  const controller = timeoutMs !== null ? new AbortController() : null;
  const timer = timeoutMs
    ? setTimeout(() => {
        controller?.abort();
      }, timeoutMs)
    : undefined;

  const abortHandler = () => {
    controller?.abort();
  };

  if (signal && controller) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", abortHandler, { once: true });
    }
  }

  try {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const isBlob = typeof Blob !== "undefined" && body instanceof Blob;
    const isUrlEncoded = typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams;
    const finalHeaders = new Headers(headers ?? {});
    if (body && !isFormData && !isBlob && !isUrlEncoded && !finalHeaders.has("Content-Type")) {
      finalHeaders.set("Content-Type", "application/json");
    }
    const response = await fetch(`${getApiUrl()}${path}`, {
      ...rest,
      body,
      method,
      headers: finalHeaders,
      signal: controller ? controller.signal : signal
    });

    if (!response.ok) {
      const payload = await parseError(response);
      throw new ApiError({
        code: payload.error.code,
        message: payload.error.message,
        details: payload.error.details,
        status: response.status
      });
    }

    const contentType = response.headers.get("content-type") ?? "";
    switch (parseAs) {
      case "arrayBuffer":
        return (await response.arrayBuffer()) as T;
      case "text":
        return (await response.text()) as T;
      default:
        if (!contentType.includes("json")) {
          throw new ApiError({ code: "invalid_response", message: "Expected JSON response" });
        }
        return (await response.json()) as T;
    }
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
    if (signal && controller) {
      signal.removeEventListener("abort", abortHandler);
    }
  }
}
