# MyHealthVault — Project Handoff

Status as of **2026-10-10**. Written for whoever (human or AI) continues the work.
Read this file, then `AGENTS.md`, before changing anything.

---

## 1. What this is

MyHealthVault (repo name: lost-in-transit, GitHub: `venuvivek-byte/MediLink`) is a
patient-controlled health record app. Patients upload prescriptions and lab
reports; the app reads them (OCR + AI), the patient reviews and confirms the
extracted medicines, lab results, conditions and allergies, and can then share
selected records with a doctor (PIN-protected link) or expose critical info on an
emergency QR card.

Priorities, in order: **privacy/security → extraction traceability → workflows → polish.**

- Production: https://myhealthvault-beryl.vercel.app (Vercel, deploys on every push to `main`)
- Database: Supabase project `rvaxbmxddnrvwiqyzsyq` (the MAIN project — see rules below)

## 2. Stack

| Area | Choice |
|---|---|
| Framework | **Next.js 16.4** (App Router, Cache Components / Partial Prerendering). `middleware` is now **`proxy.ts`**. APIs differ from older Next — read `node_modules/next/dist/docs/` first. |
| UI | React 19.3, TypeScript, Tailwind 4, shadcn-style components on `@base-ui/react`, lucide icons, theme tokens in `app/globals.css` |
| Backend | Supabase: Postgres + Row Level Security, Auth (email/password + Google OAuth), private Storage bucket `medical-documents` |
| AI | Gemini `gemini-3.5-flash` (reads photos/scans AND extracts structured data). **Groq** is the automatic backup. OpenAI supported for extraction (not configured). |
| OCR | Gemini vision (production), or local PaddleOCR FastAPI service in `services/ocr` (Python 3.13, `.venv`) |
| Tests | Vitest. Database tests run the real migrations on **PGlite** with a Supabase shim (`tests/db`). |
| Hosting | Vercel |

## 3. Running it

```bash
npm install
cp .env.example .env.local      # fill in values (see section 5)
npm run dev                     # http://localhost:3000
npm run check                   # typecheck + lint + tests + build — run before every commit
```

- `DEMO_MODE=true` runs with fictional data and no Supabase at all (read-only demo).
- Live AI tests (opt-in, cost quota): `LIVE_AI=1 GEMINI_LIVE_MODELS=gemini-3.5-flash npx vitest run tests/live`
- DB migrations: add a new numbered file in `supabase/migrations/`, then `npm run db:push` (the project owner runs this), then `npm run db:gen-types:linked` to regenerate `lib/types/database.types.ts`.

## 4. Rules that must not be broken

1. **Never edit an applied migration.** `001`–`008` are applied to production. Add `009_...sql` and onward.
2. **Never run destructive / RLS tests against the main Supabase project** (`rvaxbmxddnrvwiqyzsyq`, the one in `.env.local`). A separate test project is required (Phase 6).
3. **No real patient data** goes into the app until the RLS tests against the test project pass. `docs/real_presciptions/` holds third-party test images and is gitignored — keep it out of git and out of the database.
4. **Pushing `main` deploys production.** Only push after the owner approves.
5. **Never paste or commit API keys.** `.env.local` is gitignored. (A Groq key was pasted into a chat on 2026-10-10 — it must be revoked; see section 9.)
6. Every server action and route handler **re-checks the session itself** (`lib/auth/session.ts`); never trust that the page that rendered it was authorised.
7. The **service-role key bypasses RLS**. It is used in exactly one place, `lib/sharing/store.ts`, after resolving a hashed public token. Keep it that way.
8. Patient writes go through **`SECURITY INVOKER`** database functions that write the change and its audit row in one transaction (RLS still applies). Revoke `EXECUTE` from `anon`/`PUBLIC` explicitly — Supabase grants it by default.
9. Health data is never server-cached: pages read data inside `<Suspense>` after `connection()` / session checks.
10. Tests must not depend on the developer's `.env.local` (`tests/helpers/env.ts` stubs every app variable).
11. AI output is never trusted: it is schema-validated, evidence-checked against the source text, and nothing is saved until the patient confirms it. "Patient-reviewed" is never presented as clinical verification.
12. Do not paste Google Stitch (designer tool) HTML into the app — port designs visually onto existing components/tokens.

## 5. Environment variables

| Variable | Purpose |
|---|---|
| `DEMO_MODE` | `true` = fictional demo data, no Supabase |
| `NEXT_PUBLIC_APP_URL` | Public base URL; share links and emergency QR codes are built from it. Must be the public https URL in production. |
| `SESSION_SECRET` | 32+ chars. Signs cookies **and derives emergency QR tokens** — rotating it invalidates every printed emergency card. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. Needed for public share/emergency links. Set on Vercel (Secret). |
| `AI_PROVIDER` | `gemini` / `openai` / `none` |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Gemini (currently FREE tier: 20 requests/day, 2 per document) |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Optional alternative extraction provider |
| `OCR_ENABLED`, `OCR_PROVIDER` | `gemini` (production) or `paddleocr` (local service) |
| `OCR_SERVICE_URL`, `OCR_SERVICE_TOKEN` | PaddleOCR service address + shared secret |
| `GROQ_API_KEY` | Enables the automatic backup. **Not yet set on Vercel.** |
| `GROQ_MODEL`, `GROQ_VISION_MODEL` | Optional overrides (defaults `openai/gpt-oss-120b`, `qwen/qwen3.8-27b`) |
| `MAX_UPLOAD_SIZE_MB` | ≤ 5 |

## 6. Code map

| Path | What it does |
|---|---|
| `proxy.ts` | Optimistic redirect to /login; refreshes Supabase session cookie. Not the security boundary. |
| `lib/config/` | Validates env vars (`schema.ts`), never echoes secret values |
| `lib/auth/session.ts` | The single place that decides who the patient is |
| `lib/data/` | Data Access Layer: `PatientRepository` with Supabase and demo implementations; DTOs in `types.ts`; row→DTO `mappers.ts` |
| `lib/documents/service.ts` | Upload, processing pipeline (PDF text → OCR → AI → verify), review data, confirm/cancel |
| `lib/ocr/` | OCR providers: `gemini.ts`, `groq.ts`, PaddleOCR + `FallbackOcrProvider` in `index.ts` |
| `lib/ai/` | Extraction schema, prompt, providers (`gemini`, `openai`/`groq`), `verify.ts` (evidence check, `[illegible]` flag), `runExtractionWithFallback` |
| `lib/domain/` | Name normalisation, insights, `lookalike.ts` (confusable medicine names) |
| `lib/records/service.ts` | Edit medication status, delete records, dismiss duplicates |
| `lib/sharing/` | `tokens.ts`, `policy.ts`, `public-access.ts` (public share/emergency flow), `store.ts` (service-role, token-hash lookups), `service.ts` (patient actions), `emergency-view.ts` |
| `lib/security/` | CSP and security headers, HMAC signed tokens |
| `app/(app)/` | Signed-in pages: overview, timeline, documents (+ review), medications, lab-results, share, emergency, audit, settings |
| `app/share/[token]`, `app/emergency/[token]` | Public pages (no login) |
| `app/api/` | Upload, process, original image, file download, share PIN verify, sign-out |
| `supabase/migrations/` | `001`–`008` (all applied) |
| `tests/` | Unit tests; `tests/db/` PGlite DB tests; `tests/live/` opt-in live AI tests |
| `services/ocr/` | PaddleOCR FastAPI service |

## 7. What has been done

### Starting point
A UI prototype ("Lost in Transit"/MediLink) where pages read demo data directly; the share PIN, emergency token and demo cookie were bypassable; there were no tests.

### Phase 1 — Secure foundation (`63c9958`)
- Validated configuration; `DEMO_MODE` and `SESSION_SECRET` are server-only (replaced `NEXT_PUBLIC_DEMO_MODE`, `SHARE_TOKEN_SECRET`).
- Signed HttpOnly cookies; one session module; Data Access Layer so pages never query directly.
- Removed the bypassable share PIN / emergency token / demo cookie; public tokens fail closed in real-user mode.
- Security headers (CSP without nonces because of PPR, no-referrer, frame-ancestors none, noindex).
- Honest UI (no fake "verified" claims); Vitest introduced.

### Phase 2 — Database, auth, RLS (`b319193`, migrations 003–005)
- 003: revoked default grants from `anon`/`authenticated`, per-table least-privilege grants, RLS policies `patient_id = auth.uid()`, private storage bucket with owner-folder policies, hashes unreadable by API roles.
- 004: schema v2 — constrained enums, same-patient composite foreign keys, source traceability (page + excerpt + extraction id), document pipeline columns, `emergency_access`, `share_access_logs`, one-way revocation trigger, auto profile on sign-up.
- 005: Google OAuth profile names; audit inserts via an RLS policy instead of `SECURITY DEFINER`.
- Supabase email/password + Google OAuth with email confirmation. PGlite DB test harness. Vercel deployment in real-user mode.

### Phase 3 — Upload, OCR, AI, review (`13c1407`, `73faf39`, migration 006)
- Upload validation (PDF/JPEG/PNG, ≤5 MB, magic bytes, SHA-256 duplicate detection), private storage paths `patientId/docId/sha256.ext`.
- Pipeline: embedded PDF text → OCR only for pages without text → Gemini extraction with a JSON schema.
- **Evidence check**: every extracted item must quote the source verbatim; quotes/values not found in the text are flagged. Ambiguous dates (09/10 vs 10/09) flagged.
- Review screen: patient edits/confirms; `confirm_extraction` RPC writes all records + audit atomically; page-level traceability.
- Gemini vision reads photos/scans when no OCR server is hosted.

### Phase 4 — Record management (`5f93f54`, migration 007)
- Patient sets medication status/dates (never assumed "current"), deletes records, marks duplicate groups as "not a duplicate" (`duplicate_decisions`).
- Lab high/low flag stored exactly as printed (never computed). Timeline filters.
- UI readability/mobile pass (`4dc464b`, `eb0a624`).

### Phase 5 — Sharing, emergency, audit (`f3cbcd8`, migration 008)
- **Share links**: 256-bit token + 6-digit PIN, stored only as SHA-256 / bcrypt hashes; patient picks categories (allergies, conditions, medications, lab results, timeline), reviewed-only by default, expiry 24 h–90 days, consent; link and PIN shown once with QR; immediate revocation.
- **PIN brute-force protection**: an attempt is reserved atomically *before* checking (row lock), 5 attempts per 15 minutes, 20 per link then locked until expiry; parallel guesses cannot bypass it. Granted access fails closed if it cannot be logged.
- **Emergency card**: nothing shown unless the patient opts in (blood group, DOB, allergies, active conditions, emergency contact, chosen medications, note); reprintable QR derived from row id + `SESSION_SECRET` (only hash stored); edit in place, replace, turn off; preview and public page built by one function.
- **Profile editing** (name, DOB, blood group, emergency contact).
- **Audit**: access history (opened / wrong PIN / locked / expired / revoked, keyed IP hash, throttled) and account activity.
- 18 PGlite DB tests + 37 unit tests for this phase.

### Phase 5.5 — Handwritten prescriptions (`9ff9eb1`, `3710612`)
- Every highlighted entry (failed evidence check, AI-uncertain, contains `[illegible]`, or look-alike medicine name) needs an explicit decision: "I checked it" or "I can't read it, don't save". Confirm is disabled until all are decided.
- Records containing `[illegible]` are rejected by the server.
- Original photo shown beside highlighted entries (same-origin, owner-only, no-store route `app/api/documents/[id]/original`); PDFs open at the cited page in a new tab.
- Look-alike warning for 21 confusable medicine name groups (+ one-letter misreads).
- Upload button no longer gets stuck after a network error.

### Groq backup (`2f334cd`)
- If Gemini is **unavailable** (quota, outage, timeout) photos are read by Groq `qwen/qwen3.8-27b` and extraction runs on Groq `openai/gpt-oss-120b`. Invalid output, unreadable documents and bad keys never fall back. PDFs and photos > 3 MB are not supported by the backup.
- When the backup was used, the review screen shows a banner and **every** entry needs the patient's check. The extraction records which providers actually ran.
- Measured on two real handwritten prescriptions: Gemini read medicines, doses and diagnoses correctly; Groq misread doses, dropped letters ("Cindac-A"), never wrote `[illegible]`, and treated a clinic's printed specialty list as diagnoses. **Groq is an emergency backup only.**

### UI redesign by a teammate (`a60d10b` … `216e96c`)
Dashboard redesign, full-screen login landing page, navigation tweaks.

## 8. Remaining work

### P0 — do first
1. **Revoke the leaked Groq key** (console.groq.com → API Keys), create a new one, put it in `.env.local` and on Vercel production (`GROQ_API_KEY`, Secret), redeploy.
2. **Gemini billing**: the key is on the free tier (20 requests/day ≈ 10 documents/day for everyone; free-tier data may be used by Google). Enable billing + a budget alert before real users.
3. **Create a separate Supabase test project** for RLS tests (the owner must create it and provide URL/keys).

### Phase 6 — Tests, docs, deploy decisions
1. **RLS integration tests against the hosted test project**: as user A, attempt to read/write user B's documents, records, storage objects, shares, emergency rows, audit/access logs; as `anon`, everything must fail; public share/emergency flows only via hashed tokens. (PGlite tests in `tests/db` already cover the SQL; this proves the hosted project's grants/policies/storage match.)
2. **End-to-end tests (Playwright)**: sign up/sign in; upload → review (decision gate) → confirm → records appear; share link → wrong PIN ×5 → locked → right PIN → summary → revoke; emergency create → open → turn off; audit entries.
3. **Clear quota message**: distinguish "daily AI limit reached" (HTTP 429 quota) from a generic outage in `lib/documents/errors.ts`, and tell the user the document is saved and when to retry.
4. **Docs**: update `README.md` and `docs/DEPLOYMENT.md`; add security/privacy notes (which providers receive documents: Google Gemini, Groq, Supabase, Vercel; service-role usage; `SESSION_SECRET` rotation effect).
5. **In-app privacy notice** naming the providers that process documents.
6. **Deploy decisions**: production OCR (Gemini vision vs. hosted PaddleOCR vs. Azure); background processing for long multi-page scans (process route has a 300 s budget).

### Planned
- **Azure AI Vision "Read" OCR provider** (free F0 tier, strong on handwriting). The owner is creating an Azure resource. Plan: `lib/ocr/azure.ts` implementing `OcrProvider`, `OCR_PROVIDER=azure`, env `AZURE_VISION_ENDPOINT` / `AZURE_VISION_KEY`; compare against Gemini on `docs/real_presciptions/` before adopting.
- **Port the Google Stitch UI design** visually onto existing components and `app/globals.css` tokens (no pasted HTML; keep auth, data and accessibility wiring).

### Known gaps / backlog
- Review decisions are enforced in the UI only (server enforces `[illegible]` rejection, not "every flagged item was checked").
- PDFs are not shown inline on the review screen (CSP `frame-src 'none'`).
- Look-alike list is short (21 groups) and not exhaustive.
- No per-IP rate limiting on public endpoints (per-link PIN lockout exists; tokens are unguessable).
- "Print card" prints the whole page, not a card layout.
- Not built: sharing original documents, date-range filters on shares (DB columns exist), email alerts when a link is opened.
- Demo data has no unreviewed records.
- Lint warnings in `app/(app)/page.tsx` (unused `allergies`, `conditions`) from the UI redesign.

## 9. Open decisions for the owner
- Gemini billing on/off.
- Whether to keep Groq as backup and add its key to Vercel (after revoking the leaked one).
- Azure Read: adopt or not, after comparison.
- Supabase test project for Phase 6.

## 10. How the previous work was run (process)
Work went phase by phase; after each phase a gate report (what changed, real check output, known gaps, manual verification steps) was given and the owner approved before commit/deploy. `npm run check` was green at every commit. Keep doing this.
