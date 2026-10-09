# MyHealthVault

A patient-controlled medical-record app. It turns scattered prescriptions, lab reports and other documents into one organised, reviewable record that the patient can share with clinicians on their own terms.

MyHealthVault organises information. It does **not** diagnose, prescribe, interpret lab results or check drug interactions.

---

## Status

The project is being built in phases. This table describes what works **today**.

| Area | Status |
|---|---|
| Demo mode (fictional patient, no credentials needed) | ✅ Working |
| Sign-up / sign-in (Supabase Auth) | ⚠️ Implemented; not yet verified end-to-end with a real account |
| Server-side session checks on every private page and API route | ✅ Phase 1 |
| Read-only views: dashboard, timeline, documents, medications, lab results, audit history, settings | ✅ Read through a per-patient data layer |
| Rule-based duplicate-medication and repeat-test flags | ✅ Basic rules (refined in Phase 4) |
| Database schema hardening, profile creation, stricter RLS | ⏳ Phase 2 |
| Document upload, OCR, AI extraction, patient review | ⏳ Phase 3 (the upload API currently returns `501`) |
| Share links with hashed tokens, bcrypt PINs, rate limiting, revocation | ⏳ Phase 5 (in real-user mode every share link is rejected) |
| Emergency QR access | ⏳ Phase 5 (demo link only) |
| Drug-interaction checking | ❌ Not planned without a licensed clinical data source |

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure

```bash
cp .env.example .env.local
```

Configuration is validated when the server starts. A missing or invalid setting stops the server with a message that names the variable but never shows its value.

- **Demo mode:** leave `DEMO_MODE=true`. Nothing else is required for local development.
- **Real-user mode:** set `DEMO_MODE=false`, fill in the Supabase variables, and set `SESSION_SECRET`:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
  ```
- `SESSION_SECRET` is also required for **any production deployment**, including a deployed demo.
- `NEXT_PUBLIC_DEMO_MODE` has been replaced by the server-only `DEMO_MODE`. Startup fails with a rename message if only the old name is set.

### 3. Database setup (real-user mode only)

The project includes the **Supabase CLI** as a project dependency with convenient npm scripts.

#### Option A: Remote Supabase Project (Recommended)
1. **Link your Supabase project**:
   ```bash
   npm run supabase -- link --project-ref <your-project-ref>
   ```
2. **Push database migrations** (all files in `supabase/migrations/`):
   ```bash
   npm run db:push
   ```
3. **Generate TypeScript types**:
   ```bash
   npm run db:gen-types:linked
   ```

#### Option B: Local Supabase Stack (Requires Docker)
1. **Start the local Supabase stack**:
   ```bash
   npm run supabase -- start
   ```
2. **Apply migrations and seed data**:
   ```bash
   npm run db:reset
   ```
3. **Generate types from local DB**:
   ```bash
   npm run db:gen-types
   ```

#### Supabase CLI NPM Scripts:
| Command | Action |
|---|---|
| `npm run supabase -- <cmd>` | Execute any Supabase CLI command |
| `npm run db:link` | Link to a remote Supabase project |
| `npm run db:push` | Push pending migrations to linked database |
| `npm run db:pull` | Pull remote database schema changes into migrations |
| `npm run db:reset` | Reset database and apply migrations + seed data |
| `npm run db:status` | Check status of local Supabase services |
| `npm run db:gen-types` | Generate TypeScript definitions from local database |
| `npm run db:gen-types:linked` | Generate TypeScript definitions from linked remote project |

---

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000.

In demo mode:
- Choose **Continue as demo patient** to sign in as the fictional patient Ananya Rao.
- The demo clinician link is `/share/demo-clinician-share-token` and its PIN is `482910`.
- The demo emergency link is `/emergency/demo-emergency-token`.

These demo credentials only work when `DEMO_MODE=true`. They only ever show fictional data.

---

## Checks

| Command | What it runs |
|---|---|
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit and route tests (`tests/`) |
| `npm run build` | Production build |
| `npm run check` | All of the above, in order |

Tests never read `.env.local`. Each test sets the environment it needs.

---

## Architecture (Phase 1)

- **`proxy.ts`:** optimistic redirects only. It refreshes the Supabase session cookie and sends visitors without a session to `/login`. Public `/share/<token>`, `/emergency/<token>` and `/api/*` are excluded from it.
- **`lib/auth/session.ts`:** the authoritative session check.
  - In demo mode it accepts a signed HttpOnly cookie, and only when `DEMO_MODE=true`.
  - In real-user mode it uses Supabase `getUser()`.
- **`lib/data/`:** the Data Access Layer. Each repository is bound to one patient when it is created.
  - The Supabase repository queries through Row Level Security and also filters by `patient_id`.
  - The demo repository applies the same filtering to in-memory fictional data.
  - The UI only receives DTOs, never storage paths, token hashes or PIN hashes.
- **`lib/config/`:** Zod-validated configuration. Demo mode never contacts Supabase or AI providers.

---

## Known dependency advisory

`npm audit` reports 9 "high" findings. All of them come from one advisory in `braces`, a glob-matching library. It is pulled in only by developer tooling (`eslint-config-next` and the `shadcn` CLI), so it cannot be reached from the running app. npm's suggested fixes are major-version downgrades, so they have not been applied.
