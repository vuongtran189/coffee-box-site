import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),

  CORS_ORIGINS: z.string().default(""),
  WIDGET_PUBLIC_KEY: z.string().min(8).default("dev_public_key_change_me"),

  MONGODB_URI: z
    .string()
    .min(1)
    .default("mongodb://root:root@localhost:27017/vibe_chatbot?authSource=admin"),
  MONGODB_DB: z.string().min(1).default("vibe_chatbot")
});

export function loadEnv() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid env: ${msg}`);
  }

  const env = parsed.data;
  if (env.NODE_ENV === "production") {
    if (env.WIDGET_PUBLIC_KEY === "dev_public_key_change_me") {
      throw new Error("Invalid env: WIDGET_PUBLIC_KEY must be set in production.");
    }
  }
  const corsOrigins = env.CORS_ORIGINS
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return { ...env, corsOrigins };
}
