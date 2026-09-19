/// <reference types="astro/client" />

type RuntimeEnv = {
  DATABASE_URL: string;
  AUTH_SECRET: string;
  APP_URL: string;
  ALLOWED_ORIGINS: string;
  ENVIRONMENT: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  FILES: R2Bucket;
  ASSETS: Fetcher;
};

declare namespace App {
  interface Locals {
    runtime: { env: RuntimeEnv };
  }
}
