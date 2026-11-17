# Topic Board

A small, invite-only board where people post **topics** (a task, a goal, notes with links, and files) and
others add **progress updates** underneath. Built for a handful of people, like family, to keep track of
shared projects.

- Magic-link sign-in (no passwords), invite-only
- Topics with task, goal, Markdown notes, status (Open / Active / Wrapped up) and attachments
- Progress timeline with Markdown, files, edit and delete for your own posts
- Search, status filters and "new since your last visit" markers
- Email when someone adds progress to your topic (opt-out in Settings)
- Light and dark mode; works on phones

## Stack

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · PostgreSQL + Drizzle ORM ·
Azure Blob Storage · Azure Communication Services Email · Azure Container Apps.
Locally, files go to `.data/uploads` and emails show up at `/dev/mail`, so you don't need Azure to run it.

## Run it locally

You need Node 22 and PostgreSQL 16.

```bash
npm install
```

```bash
cp .env.example .env.local   # then set DATABASE_URL and ADMIN_EMAILS (your email)
```

```bash
npm run db:migrate
```

```bash
npm run db:seed   # optional: example topics
```

```bash
npm run dev
```

Open <http://localhost:3000>, enter the email from `ADMIN_EMAILS`, then open
<http://localhost:3000/dev/mail> and click the sign-in link.

## Tests

```bash
npm test            # unit + integration tests (needs a Postgres database named *_test)
```

```bash
npm run build && npm run test:e2e   # browser tests with Playwright
```

Both use `TEST_DATABASE_URL` (default `postgres://taskboard:taskboard@localhost:5432/taskboard_test`) and
wipe that database first. CI runs lint, typecheck, both test suites and a production build on every push.

## Where things live

| Path | What |
|---|---|
| `src/app/(app)` | Signed-in pages: board, topics, members, settings |
| `src/app/(auth)` | Sign-in, link confirmation, first-time name prompt |
| `src/app/actions` | Server actions (every one re-checks the session) |
| `src/lib/data` | Data access and permission rules ("only the author can change it") |
| `src/lib/auth` | Magic links and sessions (only hashes of tokens are stored) |
| `src/lib/storage` | Local disk or Azure Blob Storage with signed URLs |
| `src/db/schema.ts`, `drizzle/` | Database schema and migrations |
| `src/app/globals.css` | Colour tokens for light and dark mode |
| `src/components/status.tsx`, `attachments.tsx`, `avatar.tsx` | The accent colours (status pills, file types, avatars) |
| `docs/AZURE.md`, `infra/azure/setup.sh` | Deploying to Azure |

## Changing the schema

Edit `src/db/schema.ts`, then:

```bash
npm run db:generate -- --name describe-the-change
```

```bash
npm run db:migrate
```

Commit the new file in `drizzle/`. Production applies it when the container starts.
