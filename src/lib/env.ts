import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  API_KEY: z.string().min(8, "API_KEY must be at least 8 characters"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Validated on first use (not at import) so `next build` works without secrets. */
export function getEnv(): Env {
  if (!cached) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const problems = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new Error(`Invalid environment: ${problems}`);
    }
    cached = result.data;
  }
  return cached;
}
