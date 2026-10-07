---
name: kiguflow-client-api-debug
description: Diagnose and repair KiguFlow client create or update API failures, especially database enum and migration mismatches. Use when POST or PATCH /api/admin/clients returns 500 or a client field has different UI, validation, ORM, and database values.
---

# KiguFlow client API debugging

## Goal

Find the exact failure boundary, repair one coherent client-data contract, and verify the same running application the user is using.

## Required workflow

1. Reproduce the request on the user's stated port. Do not start another development server or move the user to another port.
2. Inspect the browser Network response and the server error. Record the endpoint, request body keys, response status, and database error class. Never copy credentials from `.env` into output.
3. Trace every submitted field through these layers:
   - create/edit form (`src/components/admin/Clients.tsx`, `src/components/admin/ClientDetail.tsx`)
   - request validation (`src/schemas/api.ts`)
   - route (`src/server/app.ts`)
   - Drizzle schema (`src/db/schema.ts`)
   - migration and journal (`drizzle/*.sql`, `drizzle/meta/_journal.json`)
4. For enum-backed fields, compare both the displayed option label and submitted option value. The values in the form, Zod schema, Drizzle enum, and database type must be identical.
5. Inspect migration history before modifying it. Do not add a second migration that defines an existing column with a different type. Repair accidental duplicate migrations or merge markers so the journal names the canonical migration.
6. Run `npm run check`. Resolve compilation errors before testing the browser.
7. In the user's browser on the same port, create a uniquely named test client. Confirm a 201 response, that the list refreshes, and that the selected language persists on the client detail page. Remove the test client only if the user has authorized it.
8. Write or update a report under `docs/reports/` with the evidence, root cause, files changed, verification result, and any remaining deployment steps.

## Client preferred-language contract

| Layer | Required value |
| --- | --- |
| Human-facing option text | `English`, `Spanish` |
| HTML option value | `en`, `es` |
| Zod schema | `z.enum(['en', 'es'])` |
| Drizzle column | `preferredLanguage('preferred_language')` |
| PostgreSQL type | `preferred_language` enum containing `en`, `es` |
| Default | `en` |

## Diagnostic interpretation

- **400**: validation rejected the request. Compare the form payload to the Zod schema.
- **409**: the email uniqueness check worked; use a different email to test creation.
- **500 with enum/value error**: UI and database values differ. Restore the common enum values rather than changing labels into storage values.
- **500 with missing relation/column/type**: inspect applied migrations and the migration journal. Apply the canonical migration only after confirming the database state.

## Completion criteria

- No merge-conflict markers remain in tracked source or migration files.
- `npm run check` finishes with zero errors.
- The live API request succeeds on the user's requested port.
- The selected language remains correct after reading the newly created client back from the API.
