/// <reference types="astro/client" />

type RuntimeEnv = {
  DATABASE_URL: string;
  AUTH_SECRET: string;
  APP_URL: string;
  ALLOWED_ORIGINS: string;
  ENVIRONMENT: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  PORTAL_TOUR_URL_EN?: string;
  PORTAL_TOUR_URL_ES?: string;
  CLIQ_TOUR_URL_EN?: string;
  CLIQ_TOUR_URL_ES?: string;
  KICKOFF_CALENDAR_URL?: string;
  FILES: R2Bucket;
  ASSETS: Fetcher;
};

declare namespace App {
  interface Locals {
    runtime: { env: RuntimeEnv };
  }
}
