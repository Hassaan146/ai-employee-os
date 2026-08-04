# Frontend Delivery Plan — Phase 1 & Phase 2

Two frontend developers work in parallel throughout. The split is by feature
area, not by layer, so the two people rarely touch the same files.

**Percentages are of total frontend scope**, measured against the product
surface described in `EmployeeOS.md`.

| Phase | Share | Theme | Gate |
|-------|-------|-------|------|
| Phase 1 | 30% | Foundation + UI for the backend that exists today | ✅ **Complete** |
| Phase 2 | 70% | Full product surface | 🔄 **18 / 70 delivered** |

**Phase 2 progress:** 2.1 Auth (8%) and 2.3 CRM (10%) are delivered and running
on live endpoints, after `secondary` was merged into `frontend` and brought in
JWT auth, CRM, and task routes. Total frontend completion: **48%**.

---

## Why the split is 30 / 70

The backend currently consists of:

- **3 SQLAlchemy models** — `Company`, `User`, `AIEmployee` (branch `secondary`)
- **4 live HTTP endpoints** — backend `/`, `/health`; AI service `/api/health`, `/api/providers`
- **5 AI agents** with prompts and one tool, `search_crm` (branch `member3-ai-employees`)

There are no CRUD routes, no auth, and no chat endpoint. Phase 1 therefore builds
everything that *can* be built truthfully against that: the application shell,
the design system, the typed API layer, and a complete UI for those three models
plus the two services.

That is roughly 30% of the eventual frontend. The remaining 70% — CRM, quotations,
invoices, meetings, documents, tasks, reporting, workflow automation, and the
integrations — cannot start until the backend exposes the data behind them.

---

## Phase 1 — Foundation & built-backend UI (30%) ✅

### Delivered

| Area | Detail |
|------|--------|
| Project setup | Next.js 15 (App Router), React 19, TypeScript strict, Tailwind CSS v4 |
| Design system | Token-based dark theme, 14 UI primitives, inline icon set, reduced-motion support |
| App shell | Sidebar, top bar, live service pill, responsive layout, 404 page |
| Type layer | `src/lib/types.ts` — 1:1 mirrors of every backend model and enum |
| API layer | `apiFetch` wrapper (timeouts, `ApiError`), preview-fallback mechanism |
| **System status** | Fully live — probes both services, renders payloads and latency, 12-row API contract matrix |
| Dashboard | Service health, workforce summary, seat/plan stats, delivery progress |
| AI employees | List with search + role/status filters, create dialog, detail editor for every writable column, tool-permission matrix |
| Team | User table, role legend, seat usage against the plan limit |
| Company & plan | Workspace record, usage meters, three-tier plan comparison |
| Assistant chat | Agent switcher for all 5 implemented agents, threaded messages, tool-call inspector, session id |
| Sign-in | Layout and validation only — clearly marked as non-functional until auth exists |

### Honesty mechanism

Any view backed by an endpoint that does not exist yet calls the real URL first,
then falls back to fixtures in `src/lib/fixtures.ts` and renders a **"Preview data"**
banner naming the missing endpoint. Nothing placeholder is ever presented as live.
Set `NEXT_PUBLIC_ALLOW_PREVIEW_DATA=false` to disable fallbacks entirely.

### Quality gate

| Check | Command | Status |
|-------|---------|--------|
| Types | `npm run typecheck` | ✅ passes |
| Lint | `npm run lint` | ✅ passes |
| Tests | `npm run test` | ✅ 54 tests, 5 files |
| Build | `npm run build` | ✅ 11 routes |

All four run on every pull request via `.github/workflows/frontend-ci.yml`.

**Test coverage focuses on the logic most likely to cause silent damage:**

- `client.test.ts` (16) — error normalisation, timeouts, and the exact rules for
  when a request may fall back to preview data. A 404/405/timeout/unreachable
  degrades; a 401/403/422/500 is rethrown so real failures are never masked.
- `endpoints.test.ts` (13) — pins every endpoint path and request body to the
  agreed contract, and proves a view switches to live data automatically once a
  route exists.
- `system.test.ts` (8) — a down service reads as down, never as online.
- `primitives.test.tsx` (12) — label association, disabled handling, button type.
- `DataSourceNotice.test.tsx` (5) — the preview banner always names the missing
  endpoint.

### Phase 1 is complete

The one item that cannot be closed by the frontend team is swapping fixtures for
live data — that needs the backend routes to exist. The *engineering* for it is
done and verified: `withPreviewFallback` switches to live data with no code
change, and `endpoints.test.ts` proves it. What remains is deleting
`src/lib/fixtures.ts` once every route ships, which is tracked in Phase 2.

---

## Phase 2 — Full product surface (70%)

Each block below is gated on the backend work named in **Requires**.

### 2.1 Authentication & access control — 8% ✅ **Delivered**
Sign-in, sign-up, session restore, route guards, sign-out — live against
`POST /api/v1/auth/{login,register}` and `GET /api/v1/auth/me`.

Still open in this block (deferred, needs backend): password reset, MFA, token
refresh, and role-gated UI beyond displaying the role. Also a hardening item —
the token lives in `localStorage` because the backend returns it in the JSON
body; moving to an httpOnly cookie requires a backend change.

### 2.2 Live agent chat — 10%
Replace the preview reply with real streaming responses, conversation history,
persisted memory, RAG source citations, file attachments, and voice input.
**Requires:** `POST /chat` (streaming), conversation endpoints, RAG retrieval.

### 2.3 CRM — 10% ✅ **Delivered**
Customers and leads with full CRUD, sales pipeline board with rule-checked stage
moves, and per-lead activity history — all live against
`/api/v1/crm/{customers,leads,pipeline,activities}`.

Still open in this block (needs backend): AI customer summaries and
relationship insights, which depend on the AI service.

### 2.4 Quotations & invoices — 12%
Line-item builder with tax and discounts, company branding, approval workflow,
PDF preview, payment tracking, recurring invoices, QR codes, payment links.
**Requires:** Quotation / Invoice models, PDF generation, payment provider.

### 2.5 Documents & meetings — 9%
Document upload with OCR, semantic search, AI Q&A over company knowledge,
contract analysis; meeting transcription, summaries, action items, speaker labels.
**Requires:** storage service, RAG pipeline, transcription service.

### 2.6 Tasks & reporting — 9%
Task board with assignment, priorities, deadlines, AI reminders, progress tracking;
sales/revenue/expense/customer analytics with forecasting and AI insights.
**Requires:** Task model, analytics aggregation endpoints.

### 2.7 Workflow automation — 7%
Visual trigger → action builder, run history, and error handling for chains such as
*invoice paid → receipt → CRM update → notify sales → thank-you email → follow-up*.
**Requires:** workflow engine and execution log endpoints.

### 2.8 Integrations & settings — 5%
OAuth connection flows for Gmail, Outlook, WhatsApp Business, Google Calendar,
Microsoft 365; billing and plan upgrades; notification preferences; audit logs.
**Requires:** OAuth callback endpoints, billing provider, audit log API.

---

## Two-developer split

| | **Dev A — Platform & Workforce** | **Dev B — Business Operations** |
|---|---|---|
| Phase 1 | Shell, design system, API layer, system status, dashboard | AI employees, team, company & plan, chat shell, sign-in |
| Phase 2 | 2.1 Auth · 2.2 Chat · 2.5 Documents & meetings · 2.8 Integrations | 2.3 CRM · 2.4 Quotations & invoices · 2.6 Tasks & reporting · 2.7 Workflow |
| Owns | `components/`, `lib/`, `app/(app)/system`, `app/(app)/dashboard`, `app/login` | `app/(app)/employees`, `app/(app)/team`, `app/(app)/company`, `app/(app)/chat` |

**Shared rules**

1. Anything in `src/lib/types.ts` changes only alongside the matching backend model.
2. New shared primitives go in `components/ui/primitives.tsx` — never duplicated per page.
3. Every new endpoint gets a row in the API contract table on the system status page.
4. Branch from `frontend`; one PR per numbered Phase 2 block.

---

## Backend dependencies — the critical path

Phase 2 is blocked until these exist. In priority order:

1. `POST /api/v1/auth/login` + `GET /api/v1/users/me` — unblocks everything behind a session
2. `GET|POST|PATCH /api/v1/ai-employees` — turns the workforce UI live
3. `POST /chat` on the AI service — turns the chat UI live
4. `GET /api/v1/users`, `GET /api/v1/companies/me` — turns team and company live
5. Customer / Lead / Quotation / Invoice models — unblocks 2.3 and 2.4

Also note: the two backend branches (`secondary`, `member3-ai-employees`) are not
merged into the default branch. Until they are, the models and agents this UI is
built against only exist on side branches.
