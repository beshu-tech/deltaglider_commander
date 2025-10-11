import { z } from "zod";

const envSchema = z.object({
  VITE_APP_NAME: z.string().min(1).optional().default("DeltaGlider Commander"),
  VITE_POLL_MS: z.coerce.number().int().min(1000).max(60000).optional().default(5000),
  VITE_ENABLE_UPLOADS: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .default("false"),
});

type Env = z.infer<typeof envSchema> & {
  VITE_ENABLE_UPLOADS: boolean;
};

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }
  const parsed = envSchema.parse(import.meta.env);
  cachedEnv = {
    ...parsed,
    VITE_ENABLE_UPLOADS:
      parsed.VITE_ENABLE_UPLOADS === true || parsed.VITE_ENABLE_UPLOADS === "true",
  };
  return cachedEnv;
}

/**
 * Get the API base URL based on runtime detection.
 *
 * - Development (localhost/127.0.0.1 on port 5173): Returns http://localhost:8000
 * - Production (any other host): Returns empty string (relative URLs)
 *
 * This allows the same build to work in both development and production
 * without environment-specific configuration.
 */
export function getApiUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const hostname = window.location.hostname;
  const port = window.location.port;

  // Development: Vite dev server on localhost:5173
  const isLocalDevelopment =
    (hostname === "localhost" || hostname === "127.0.0.1") && port === "5173";

  return isLocalDevelopment ? "http://localhost:8000" : "";
}

export function getPollMs(): number {
  return getEnv().VITE_POLL_MS;
}
