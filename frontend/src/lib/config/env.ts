import { z } from "zod";

const envSchema = z.object({
  VITE_API_URL: z.string().default(""),
  VITE_APP_NAME: z.string().min(1),
  VITE_POLL_MS: z.coerce.number().int().min(1000).max(60000).default(5000),
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

export function getApiUrl(): string {
  return getEnv().VITE_API_URL.replace(/\/$/, "");
}

export function getPollMs(): number {
  return getEnv().VITE_POLL_MS;
}
