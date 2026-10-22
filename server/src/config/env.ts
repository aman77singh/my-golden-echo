import dotenv from "dotenv";
import { z } from "zod";

// Load .env if present
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5001),
  CLIENT_ORIGIN: z.string().default("http://localhost:8080"),
  MONGODB_URI: z.string().default("mongodb://127.0.0.1:27017/our-space"),
  JWT_ACCESS_SECRET: z.string().min(16).default("access_secret_super_secure_32_bytes_min"),
  JWT_REFRESH_SECRET: z.string().min(16).default("refresh_secret_super_secure_32_bytes_min"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  CLOUDINARY_CLOUD_NAME: z.string().default("demo"),
  CLOUDINARY_API_KEY: z.string().default("1234567890"),
  CLOUDINARY_API_SECRET: z.string().default("abcdefghijklmnopqrstuvwxyz"),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
  JOBS_SECRET_KEY: z.string().default("our_space_cron_secret_tick_2026"),
  SEED_HER_NAME: z.string().default("Aditi"),
  SEED_HER_EMAIL: z.string().email().default("aditi@ourspace.local"),
  SEED_HER_PASSWORD: z.string().min(6).default("AditiSecret123!"),
  SEED_HIM_NAME: z.string().default("Aman"),
  SEED_HIM_EMAIL: z.string().email().default("aman@ourspace.local"),
  SEED_HIM_PASSWORD: z.string().min(6).default("AmanSecret123!"),
  SEED_COUPLE_START_DATE: z.string().default("2025-04-16T00:00:00Z"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration.");
}

export const env = parsed.data;
