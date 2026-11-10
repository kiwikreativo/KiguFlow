# Client creation API 500 repair

## Incident

Creating a client from the admin interface returned `POST /api/admin/clients` with HTTP 500.

## Investigation plan used

1. Follow the preferred-language field from the modal form to the API validator, route, Drizzle model, and migration.
2. Compare the values submitted by the browser with the PostgreSQL enum values.
3. Inspect migration metadata and source files for duplicate definitions or unresolved merge content.
4. Restore one contract across all layers.
5. Run static validation and then test the actual application on port 8787.

## Root cause

The create-client form sent `English` or `Spanish`. The deployed database migration defines `clients.preferred_language` as the PostgreSQL enum `preferred_language`, whose only allowed values are `en` and `es`. The insert therefore reached PostgreSQL with an invalid enum value and became an unhandled 500 response.

The same unresolved merge content also created duplicate client-language fields and declarations in the schema, API schema, client form, client detail form, and Drizzle migration journal. One duplicate migration attempted to add the enum-backed column as `text` with an `English` default.

## Changes made

| Area | Change |
| --- | --- |
| Create client form | Keeps English and Spanish as labels; submits `en` or `es`; requires a selection. |
| Client detail form | Uses the same values for display, update, and TypeScript typing. |
| API validator | Accepts only `en` and `es`; defaults to `en`. |
| Drizzle schema | Uses the `preferred_language` PostgreSQL enum with default `en`. |
| Migrations | Retains `0005_admin_briefs_bundles_i18n.sql`, the canonical enum migration; removes the conflicting text-column migration. |
| Migration journal | Restores the canonical `0005_admin_briefs_bundles_i18n` entry. |
| Workflow | Adds `skills/kiguflow-client-api-debug/SKILL.md`. |

## Verification

- Static validation: `npm run check` completed with **0 errors**. Existing deprecation notices remain unchanged.
- Source scan: no merge-conflict markers remain.
- Live API verification on port 8787: passed. An authenticated request created a verification client with `preferredLanguage: "es"`; a follow-up read returned the same value.

## Manual validation checklist

1. Open the admin Clients page on port 8787 and select **New client**.
2. Select English and submit a unique email address.
3. Confirm the response is 201 and the client appears in the list.
4. Open the client and confirm the language displays as English.
5. Change the language to Spanish, save, reload, and confirm it persists.

## Deployment note

The canonical migration already defines the database enum and column. Do not apply the removed text-column migration. If a database has not yet received the canonical migration, inspect its migration history and apply the canonical migration once through the project migration command.
