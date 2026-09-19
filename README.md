# KiguFlow

KiguFlow is a private freelance client-operations portal. It centralizes clients, projects, phases, tasks, reusable project plans, client actions, briefs, files, documents, invoices, progress, portal access, and activity history.

## Stack

- Astro SSR with React islands and Tailwind CSS
- Hono API on the Cloudflare Workers runtime
- Neon-compatible PostgreSQL with Drizzle ORM
- Cloudflare R2 for file objects
- Zod validation and secure HTTP-only cookie sessions
- Vitest for focused domain and security tests

The application is intentionally single-admin. API routes are grouped under `/api/admin/*` and protected on the server. Client portal routes resolve a random token through a SHA-256 hash stored in PostgreSQL; project IDs never grant portal access.

## Requirements

- Node.js 22+
- A Neon or PostgreSQL database reachable over TLS
- Cloudflare account with an R2 bucket for deployment

## Setup

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The development URL is `http://localhost:8787`. `npm run dev:astro` is available for frontend-only work, but full R2 behavior should be exercised through Wrangler.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon/PostgreSQL connection URL |
| `AUTH_SECRET` | Reserved application secret, at least 32 random characters |
| `ADMIN_EMAIL` | Admin account created by the seed command |
| `ADMIN_PASSWORD` | Admin password used only by the seed command |
| `APP_URL` | Public application origin |
| `ALLOWED_ORIGINS` | Comma-separated trusted browser origins |
| `R2_*` | R2 account, bucket, and optional public URL configuration |
| `RESEND_API_KEY` | Reserved for V2 email delivery |
| `ENVIRONMENT` | `development` or `production`; controls secure cookies |

Never commit `.env`. Production secrets should be configured with `wrangler secret put` or the Cloudflare dashboard. Update the `FILES` binding and bucket name in `wrangler.toml` for the target account.

## Database

Generate a migration after schema changes and apply committed migrations:

```bash
npm run db:generate
npm run db:migrate
```

Create the single admin, five reusable project templates, and realistic demo project data:

```bash
npm run db:seed
```

Template phases and tasks are copied inside one transaction. Existing projects never retain references to mutable template tasks.

## Authentication and portal security

Admin passwords use Worker-compatible PBKDF2-SHA256 with 310,000 iterations and a random salt. Login creates a random session token; only its SHA-256 hash is stored. The browser receives an `HttpOnly`, `SameSite=Lax`, path-scoped cookie that is `Secure` in production. Mutations validate trusted origins.

Portal links contain 256-bit random tokens. Only token hashes are stored. Portal queries enforce project scope and task visibility in SQL. A client can complete only a client-assigned, client-visible task belonging to the token's project.

## Files

File objects are written to R2 under random keys; PostgreSQL stores metadata and object keys. Uploads are allow-listed, capped at 10 MB, and compensated if metadata persistence fails. Downloads are private and authenticated. Configure the `FILES` R2 binding before testing uploads.

## Quality checks

```bash
npm run check
npm test
npm run build
```

`npm run build` performs Astro/TypeScript checking, the production build, and a Wrangler dry run.

## Deployment

Create a Neon database and R2 bucket, configure environment variables and secrets in Cloudflare, apply migrations from a trusted deployment environment, then run:

```bash
npm run build
npx wrangler deploy
```

The intended Git remote is `git@github.com:kiwikreativo/KiguFlow.git` on branch `main`.

## MVP boundaries

KiguFlow tracks invoice records and uploaded PDFs but does not process payments. Contracts are uploaded documents; electronic signatures are excluded. Resend is represented in configuration but outbound email and automated reminders are deferred. The current UI exposes the core admin/client/project/task/invoice flow; richer template editing, document categorization, and the visual brief builder remain natural V2 refinements.
