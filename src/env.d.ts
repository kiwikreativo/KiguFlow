/// <reference types="astro/client" />

type RuntimeEnv = {
  DATABASE_URL: string;
  AUTH_SECRET: string;
  APP_URL: string;
  ALLOWED_ORIGINS: string;
  ENVIRONMENT: string;
  FILES: R2Bucket;
  ASSETS: Fetcher;
};

declare namespace App {
  interface Locals {
    runtime: { env: RuntimeEnv };
  }
}
