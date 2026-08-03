# AI Employee OS — Frontend

Next.js web console for AI Employee OS. Built against the backend that exists in
this repository today; see [PHASES.md](./PHASES.md) for the delivery plan.

## Tech stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js 15 (App Router) |
| UI | React 19, TypeScript (strict) |
| Styling | Tailwind CSS v4 with CSS-variable design tokens |
| Data | Native `fetch` behind a typed client in `src/lib/api/` |

No component library or state-management dependency — the primitives in
`src/components/ui/primitives.tsx` cover current needs.

## Getting started

```bash
npm install
```

Copy the environment template and adjust if your services run elsewhere:

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

The console is served at http://localhost:3000 and redirects to `/dashboard`.

### Running the backing services

The frontend expects two FastAPI services. From the repository root:

```bash
cd backend && uvicorn app.main:app --reload --port 8000
```

```bash
cd ai && uvicorn app.main:app --reload --port 8001
```

The **System status** page shows whether each one is reachable and which
endpoints are live.

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:8000` | FastAPI backend service |
| `NEXT_PUBLIC_AI_URL` | `http://localhost:8001` | FastAPI AI service |
| `NEXT_PUBLIC_ALLOW_PREVIEW_DATA` | `true` | Allow fixture fallback for unbuilt endpoints |

## Preview data

Most of the backend REST layer does not exist yet. Rather than block the UI, each
affected view calls the real endpoint first and falls back to fixtures in
`src/lib/fixtures.ts` when it 404s or the service is unreachable.

Every such view renders a **"Preview data"** banner naming the missing endpoint,
so placeholder records are never mistaken for real ones. When a route ships, the
view switches to live data with no code change. Set
`NEXT_PUBLIC_ALLOW_PREVIEW_DATA=false` to make missing endpoints fail loudly instead.

The **System status** page lists every endpoint the frontend calls and whether the
backend has shipped it.

## Routes

| Route | Data source |
|-------|-------------|
| `/dashboard` | Mixed — live health, preview records |
| `/system` | **Fully live** |
| `/employees`, `/employees/[id]` | Preview until AI-employee CRUD ships |
| `/chat` | Preview until `POST /chat` ships |
| `/team` | Preview until `GET /api/v1/users` ships |
| `/company` | Preview until `GET /api/v1/companies/me` ships |
| `/login` | Layout only — no auth endpoints exist yet |

## Project structure

```text
src/
├── app/
│   ├── (app)/              # Console shell (sidebar + top bar)
│   │   ├── dashboard/      # Overview
│   │   ├── system/         # Service health + API contract
│   │   ├── employees/      # AI employee hub and detail editor
│   │   ├── chat/           # Assistant chat
│   │   ├── team/           # Human users
│   │   └── company/        # Company record and plan
│   ├── login/              # Sign-in shell
│   ├── layout.tsx
│   └── globals.css         # Design tokens
├── components/
│   ├── layout/             # Sidebar, top bar, status pill
│   ├── ui/                 # Primitives and icons
│   └── DataSourceNotice.tsx
└── lib/
    ├── api/                # client, system, employees, organisation, chat
    ├── types.ts            # Mirrors of the backend models
    ├── fixtures.ts         # Preview data
    └── config.ts
```

## Conventions

- `src/lib/types.ts` mirrors the SQLAlchemy models exactly. Change it only when the
  backend model changes.
- Shared UI goes in `components/ui/primitives.tsx`, never duplicated per page.
- Every new endpoint the frontend calls gets a row in the API contract table on
  the system status page.

## Scripts

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm run test
```

Use `npm run test:watch` while developing.

## Quality gate

Four checks run on every pull request via `.github/workflows/frontend-ci.yml`:
typecheck, lint, test, build. Run them locally before pushing — the workflow uses
`npm ci`, so CI matches your lockfile exactly.

Tests use Vitest with Testing Library and jsdom. They concentrate on the API
layer, since the preview-fallback rules are the part of this codebase where a
mistake would be least visible: a wrong rule could render fixture data as if it
were live. `src/lib/api/client.test.ts` pins those rules in both directions.
