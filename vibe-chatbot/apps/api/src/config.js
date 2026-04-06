import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),

  CORS_ORIGINS: z.string().default(""),
  WIDGET_PUBLIC_KEY: z.string().min(8).default("dev_public_key_change_me"),

  // Admin dashboard (optional)
  ADMIN_PASSWORD: z.string().default(""),
  ADMIN_JWT_SECRET: z.string().default(""),
  ADMIN_TOKEN_TTL_SECONDS: z.coerce.number().int().min(300).max(30 * 24 * 3600).default(7 * 24 * 3600),
  ADMIN_OPEN: z.string().default(""),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(16).max(4000).default(350),
  OPENAI_INSTRUCTIONS: z.string().default(""),

  VIBE_KNOWLEDGE_PATH: z.string().default(""),
  VIBE_KNOWLEDGE_TEXT: z.string().default(""),
  VIBE_KNOWLEDGE_MAX_CHARS: z.coerce.number().int().min(0).max(20000).default(8000),

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
    if (!env.OPENAI_API_KEY) {
      // OpenAI is optional; keep API usable for lead capture even if not configured.
    }
  }
  const corsOrigins = env.CORS_ORIGINS
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return { ...env, corsOrigins };
}
