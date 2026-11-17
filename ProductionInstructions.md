# Production release: Problem reports phase + sidebar alignment

Do these steps after the pull request is merged into `main`. Production deploys are manual (`wrangler deploy`). Merging to `main` does not deploy anything.

## 1. Update your local `main`

```bash
git checkout main
git pull origin main
pnpm install
```

## 2. Check that the build passes

```bash
pnpm test
pnpm build
```

Astro needs Node **22.23.4 or newer** (`node -v`). Older versions stop the build before it starts. If the build fails, don't deploy.

## 3. Back up the production database

Choose one:

- **Neon dashboard:** open the project, go to *Branches*, and create a branch from `main` (instant, and you can restore from it).
- **GitHub:** go to *Actions → Encrypted operational backup → Run workflow*.

## 4. Run the migration against production

This applies `drizzle/0009_problem_reports_phase.sql`. It adds the **Problem reports** phase to every template and every existing project, and moves old report tasks into that phase.

```bash
DATABASE_URL="<production Neon connection string>" pnpm db:migrate
```

Expected output: `KiguFlow migrations applied.`

- Put the production URL only in the command, not in `.env`, so you don't point local dev at production by accident.
- Do the migration **before** the deploy. The new code doesn't need it to run (a report creates the phase if it's missing), but this way existing projects already have the phase when the new code goes live.
- You don't need to run `pnpm db:seed` in production. The migration already covers the templates.

## 5. Deploy the Worker

```bash
npx wrangler deploy
```

Wrangler prints a new version ID when it finishes. If you need to roll back: `npx wrangler rollback`.

## 6. Check production (<https://kiguflow.com>)

1. **Sidebar:** the Business Hub and Clients chevrons line up vertically.
2. **Existing project:** open any project. It has a **Problem reports** phase at the end.
3. **Report flow:** open a client portal link, click **Report a problem**, and send a test report.
   - The admin email notification arrives.
   - The task `Client issue: …` appears under **Problem reports** in that project.
   - The client portal timeline does **not** show the Problem reports phase.
4. **Resolve:** mark that task **Completed**. The dashboard's open-issue indicator for the project clears.
5. Delete the test task, or leave it completed.

## If something goes wrong

- **The code is broken but the data is fine:** run `npx wrangler rollback`. The new phase rows don't hurt the old code.
- **The data is wrong:** restore from the Neon branch you made in step 3.
