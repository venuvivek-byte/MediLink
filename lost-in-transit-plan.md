# Lost in Transit — Full-Stack HealthTech MVP · Implementation Plan

## Goal Description

Build **Lost in Transit**, a patient-controlled health-record platform that:
- Ingests medical documents (PDFs, images) via AI extraction (vision LLM)
- Organises all records into a verified, unified health timeline
- Detects duplicate medications and repeated lab tests
- Generates consent-scoped, expiring, PIN-protected share links for clinicians
- Provides an emergency card with a QR code
- Maintains a full audit log of all access events

The stack is **Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Supabase + Zod + React Hook Form + date-fns + Recharts + qrcode.react**.

---

## User Review Required

> [!IMPORTANT]
>AI Provider choice — The plan uses PaddleOCR for local, cost-effective text extraction and Google Gemini Flash as the default vision-capable AI model for contextual understanding and structured JSON extraction. This combination supports extracting information from prescription images, lab reports, and medical PDFs while reducing dependence on a single cloud API. The provider is abstracted behind environment variables (AI_PROVIDER=gemini|openai|qwen), allowing the AI provider to be switched without changing the core application logic. GLM-OCR can also be integrated as an alternative document-parsing engine. If the primary AI provider is unavailable or rate-limited, the application should fall back to OCR and manual verification rather than fabricate results.

> [!IMPORTANT]
> **Supabase project** — You will need a Supabase project (free tier is fine). The plan includes a `supabase/` folder with SQL migrations that you run once. All RLS policies are included. If you skip this, demo mode works with seeded in-memory data.

> [!WARNING]
> **PIN storage** — PINs are hashed with `bcryptjs` (server-side). They are never stored in plain text and never logged. Share tokens use `crypto.randomBytes(32)` → stored as SHA-256 hash.

> [!CAUTION]
> **Medical data** — All sample data uses the fictional patient **Ananya Rao**. Real patient names must never be used in seed files. Every seeded record is labelled `is_demo: true`.

---

## Open Questions

> [!IMPORTANT]
> 1. **Max file size** — Plan defaults to **5 MB**. Acceptable?
> 2. **Share PIN length** — Plan uses 6-digit numeric PIN. Preferred?
> 3. **Emergency QR expiry** — Plan defaults to 24 h renewable. Acceptable?
> 4. **Interaction database** — No live drug-interaction DB is wired (MVP scope). The medication safety section shows "Interaction check unavailable — consult your pharmacist." Acceptable for the demo?

## ANSWERS
Update the document upload and AI extraction pipeline:

- Set the default maximum upload size to 5 MB per file, configurable through an environment variable.
- Validate file type and file size on both client and server.
- Preprocess images by resizing and compressing them while preserving medical text readability.
- For PDFs, extract embedded text first. Use OCR for scanned pages and process large documents page by page.
- Avoid sending entire documents to the AI unnecessarily. Send only the relevant text or page images needed for extraction.
- Apply page-count limits and sensible request timeouts.
- Do not silently truncate documents or discard potentially important medical information.
- If processing fails because of document size, page count, or readability, explain the reason and allow the patient to retry.
- Keep original documents securely stored and separate from temporary processing files.
- Validate all extracted medical fields and require patient verification before marking them confirmed.

Use PaddleOCR for local OCR where appropriate and Gemini as the configurable AI extraction provider. Handle API quotas and temporary failures gracefully.

---

## Proposed Changes

### Project Bootstrapping

```
BitsANDBytes/
└── lost-in-transit/          ← Next.js project root
    ├── app/                  ← App Router pages & layouts
    ├── components/           ← Shared UI components
    ├── lib/                  ← Data-access, validation, business logic
    ├── supabase/             ← SQL migrations & seed
    ├── public/
    ├── .env.example
    └── README.md
```

Bootstrap command:
```bash
npx create-next-app@latest lost-in-transit \
  --typescript --tailwind --app --src-dir=false \
  --import-alias "@/*"
```

Then install dependencies:
```bash
npm install @supabase/supabase-js @supabase/ssr \
  @hookform/resolvers react-hook-form zod \
  date-fns recharts qrcode.react lucide-react \
  bcryptjs @types/bcryptjs \
  @google/generative-ai \
  openai \
  pdfjs-dist \
  class-variance-authority clsx tailwind-merge \
  tailwindcss-animate

npm install --save-dev supabase

# Supabase CLI scripts in package.json:
# "supabase": "node ./node_modules/supabase/dist/supabase.js"
# "db:link": "node ./node_modules/supabase/dist/supabase.js link"
# "db:push": "node ./node_modules/supabase/dist/supabase.js db push"
# "db:pull": "node ./node_modules/supabase/dist/supabase.js db pull"
# "db:reset": "node ./node_modules/supabase/dist/supabase.js db reset"
# "db:status": "node ./node_modules/supabase/dist/supabase.js status"
# "db:gen-types": "node ./node_modules/supabase/dist/supabase.js gen types typescript --local > lib/types/database.types.ts"
# "db:gen-types:linked": "node ./node_modules/supabase/dist/supabase.js gen types typescript --linked > lib/types/database.types.ts"

npx shadcn@latest init
npx shadcn@latest add button card badge input label \
  select textarea dialog sheet tabs toast \
  dropdown-menu avatar separator skeleton \
  alert progress form
```

---

## Directory & File Map

### Authentication Pages
| File | Purpose |
|---|---|
| `app/layout.tsx` | Root layout — Toaster, Auth context |
| `app/(auth)/login/page.tsx` | Sign-in page |
| `app/(auth)/signup/page.tsx` | Registration page |
| `app/(auth)/onboarding/page.tsx` | New-patient profile setup wizard |

### Protected App Pages
| File | Purpose |
|---|---|
| `app/(app)/layout.tsx` | Shell: sidebar + header + mobile nav |
| `app/(app)/page.tsx` | **Overview / Dashboard** |
| `app/(app)/timeline/page.tsx` | Unified health timeline |
| `app/(app)/documents/page.tsx` | Document list + upload |
| `app/(app)/medications/page.tsx` | Medication management |
| `app/(app)/lab-results/page.tsx` | Lab results + trend charts |
| `app/(app)/share/page.tsx` | Share management |
| `app/(app)/emergency/page.tsx` | Emergency card |
| `app/(app)/settings/page.tsx` | Patient profile & settings |
| `app/(app)/audit/page.tsx` | Audit log |

### Public Pages (No Auth)
| File | Purpose |
|---|---|
| `app/share/[token]/page.tsx` | Clinician view — token + PIN gate |
| `app/emergency/[token]/page.tsx` | Minimal emergency info |

---

## Component Architecture

```
components/
├── layout/
│   ├── Sidebar.tsx          ← Desktop persistent sidebar
│   ├── MobileNav.tsx        ← Mobile bottom navigation
│   ├── Header.tsx           ← Page title + upload button + profile menu
│   └── AppShell.tsx         ← Combines sidebar + header
├── dashboard/
│   ├── HealthSnapshot.tsx   ← 4 stat cards
│   ├── RecentActivity.tsx   ← Activity feed
│   ├── AlertsPanel.tsx      ← Duplicate / verification alerts
│   └── QuickActions.tsx
├── documents/
│   ├── UploadDropzone.tsx   ← File upload with drag-and-drop
│   ├── DocumentCard.tsx
│   └── ExtractionReview.tsx ← Side-by-side original + editable fields
├── timeline/
│   ├── TimelineItem.tsx
│   ├── TimelineFilters.tsx
│   └── Timeline.tsx
├── medications/
│   ├── MedicationCard.tsx
│   ├── DuplicateAlert.tsx
│   └── MedicationStatus.tsx
├── lab/
│   ├── LabResultRow.tsx
│   ├── LabTrendChart.tsx    ← Recharts LineChart
│   └── RepeatTestAlert.tsx
├── share/
│   ├── CreateShareDialog.tsx
│   ├── ShareCard.tsx
│   ├── QRDisplay.tsx        ← qrcode.react
│   └── PinVerification.tsx
├── emergency/
│   └── EmergencyCard.tsx
└── ui/                      ← shadcn/ui re-exports + custom primitives
    ├── ConfidenceBadge.tsx
    ├── VerificationBadge.tsx
    ├── DemoModeBanner.tsx
    └── LoadingState.tsx
```

---

## Authentication & Middleware

### `middleware.ts`
```typescript
// Protects all /(app)/** routes
// Redirects unauthenticated users to /login
// Uses Supabase SSR cookie-based session
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // session refresh + route protection
}
export const config = { matcher: ['/dashboard/:path*', '/timeline/:path*', '/documents/:path*', '/medications/:path*', '/lab-results/:path*', '/share/:path*', '/emergency/:path*', '/settings/:path*', '/audit/:path*'] }
```

### `lib/supabase/server.ts` & `lib/supabase/client.ts`
Server and client Supabase helpers following the `@supabase/ssr` pattern (no deprecated `auth-helpers`).

---

## Database Layer

### Supabase CLI Workflow & Migrations

The database lifecycle is managed via the **Supabase CLI**:
- `npm run supabase -- link --project-ref <id>`: Links the repository to the remote Supabase project.
- `npm run db:push`: Applies all SQL migrations in `supabase/migrations/` sequentially.
- `npm run db:reset`: Drops local schema, applies all migrations, and runs `supabase/seed.sql`.
- `npm run db:gen-types:linked`: Generates strongly typed TypeScript definitions (`lib/types/database.types.ts`) directly from the remote database schema.
- `npm run db:gen-types`: Generates types from the local emulator.

### `supabase/migrations/001_initial_schema.sql`

Full schema with:
- Tables: `profiles`, `documents`, `medical_events`, `medications`, `allergies`, `conditions`, `lab_results`, `record_shares`, `audit_logs`
- UUID PKs via `gen_random_uuid()`
- `updated_at` triggers on all mutable tables
- GIN index on `lab_results.normalized_test_name`
- B-tree index on `record_shares.token_hash`
- RLS enabled and policies defined for every table

```sql
-- Example RLS block (replicated for every patient-owned table)
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patients_own_medications"
  ON medications FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);
```

### Table Definitions

#### `profiles`
```sql
CREATE TABLE profiles (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  date_of_birth DATE,
  blood_group  TEXT,
  emergency_contact JSONB,   -- { name, phone, relationship }
  patient_info  JSONB,       -- self-reported conditions, allergies
  metadata      JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
```

#### `documents`
```sql
CREATE TABLE documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path      TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type         TEXT NOT NULL,
  document_type     TEXT,            -- prescription | lab_report | discharge_summary | other
  document_date     DATE,
  provider_name     TEXT,
  extraction_status TEXT DEFAULT 'pending',  -- pending | processing | done | failed
  verification_status TEXT DEFAULT 'unverified',
  extracted_data    JSONB,           -- raw AI output (pre-confirmation)
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now()
);
```

#### `medical_events`
```sql
CREATE TABLE medical_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id       UUID REFERENCES documents(id) ON DELETE SET NULL,
  event_type        TEXT NOT NULL,   -- visit | prescription | diagnosis | lab | discharge | upload
  event_date        DATE,
  title             TEXT NOT NULL,
  summary           TEXT,
  verification_status TEXT DEFAULT 'unverified',
  structured_data   JSONB,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now()
);
```

#### `medications`
```sql
CREATE TABLE medications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  name               TEXT NOT NULL,
  normalized_name    TEXT,          -- lowercase stripped for duplicate detection
  ingredient         TEXT,
  strength           TEXT,
  dosage             TEXT,
  frequency          TEXT,
  route              TEXT,
  start_date         DATE,
  end_date           DATE,
  status             TEXT DEFAULT 'unknown',   -- active | historical | unknown
  verification_status TEXT DEFAULT 'unverified',
  metadata           JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ DEFAULT now()
);
```

#### `allergies`
```sql
CREATE TABLE allergies (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  substance          TEXT NOT NULL,
  reaction           TEXT,
  verification_status TEXT DEFAULT 'unverified',
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  metadata           JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ DEFAULT now()
);
```

#### `conditions`
```sql
CREATE TABLE conditions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  status             TEXT DEFAULT 'active',   -- active | resolved | unknown
  verification_status TEXT DEFAULT 'unverified',
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  metadata           JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ DEFAULT now()
);
```

#### `lab_results`
```sql
CREATE TABLE lab_results (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  test_name          TEXT NOT NULL,
  normalized_test_name TEXT,        -- for trend grouping + duplicate detection
  result_value       TEXT,
  unit               TEXT,
  reference_range    TEXT,
  is_abnormal        BOOLEAN,
  test_date          DATE,
  verification_status TEXT DEFAULT 'unverified',
  metadata           JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ DEFAULT now()
);
```

#### `record_shares`
```sql
CREATE TABLE record_shares (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash       TEXT NOT NULL UNIQUE,   -- SHA-256 of the random token
  pin_hash         TEXT NOT NULL,          -- bcrypt(pin, 12)
  scope            JSONB NOT NULL,         -- { categories, date_range, conditions }
  date_range_start DATE,
  date_range_end   DATE,
  expires_at       TIMESTAMPTZ NOT NULL,
  revoked_at       TIMESTAMPTZ,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_shares_token_hash ON record_shares (token_hash);
```

#### `audit_logs`
```sql
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  share_id    UUID REFERENCES record_shares(id) ON DELETE SET NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',   -- ip, user_agent, scope used — NO PINs, NO tokens
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_patient ON audit_logs (patient_id, created_at DESC);
```

### `supabase/migrations/002_storage.sql`
```sql
-- Private bucket: each patient's files isolated by folder = user_id
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-documents', 'medical-documents', false);

CREATE POLICY "owner_only_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "owner_only_read"
  ON storage.objects FOR SELECT
  USING (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "owner_only_delete"
  ON storage.objects FOR DELETE
  USING (auth.uid()::text = (storage.foldername(name))[1]);
```

### `supabase/seed.sql`
Fictional data for Ananya Rao — all rows tagged `"is_demo": true` in `metadata`.

---

## AI Extraction Layer

### `lib/ai/extraction.ts` (server-only)
```typescript
export async function extractMedicalDocument(
  fileBuffer: Buffer,
  mimeType: string,
  documentType: 'prescription' | 'lab_report' | 'discharge_summary'
): Promise<ExtractionResult>
```

Provider selected via env var:
```typescript
AI_PROVIDER=gemini|openai. PaddleOCR is a separate OCR layer. Add Qwen only after its provider adapter is implemented and tested.
const provider = process.env.AI_PROVIDER === 'openai'
  ? new OpenAIExtractionProvider()
  : new GeminiExtractionProvider()   // default
```

### `lib/ai/schema.ts` — Extraction Zod Schema
```typescript
export const ExtractionSchema = z.object({
  document_type: z.enum(['prescription', 'lab_report', 'discharge_summary', 'other']),
  document_date: z.string().nullable(),
  provider_name: z.string().nullable(),
  facility_name: z.string().nullable(),
  diagnoses: z.array(z.object({
    name: z.string(),
    confidence: z.number().min(0).max(1),
  })),
  medications: z.array(z.object({
    name: z.string(),
    strength: z.string().nullable(),
    dosage: z.string().nullable(),
    frequency: z.string().nullable(),
    route: z.string().nullable(),
    duration: z.string().nullable(),
    confidence: z.number().min(0).max(1),
  })),
  lab_results: z.array(z.object({
    test_name: z.string(),
    value: z.string(),
    unit: z.string().nullable(),
    reference_range: z.string().nullable(),
    is_abnormal: z.boolean().nullable(),
    confidence: z.number().min(0).max(1),
  })),
  allergies: z.array(z.object({
    substance: z.string(),
    reaction: z.string().nullable(),
  })),
  raw_confidence: z.number().min(0).max(1),
})
```

- `lib/ai/providers/gemini.ts` — uses `@google/generative-ai` with `responseMimeType: 'application/json'`
- `lib/ai/providers/openai.ts` — uses `response_format: { type: 'json_schema', ... }`

---

## API Routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/documents/upload` | POST | Session | Upload to Supabase Storage → record document |
| `/api/documents/[id]/extract` | POST | Session | Run AI extraction (or demo synthetic) |
| `/api/documents/[id]/confirm` | POST | Session | Confirm extraction → write to timeline tables |
| `/api/documents/[id]` | GET | Session | Document metadata |
| `/api/timeline` | GET | Session | Chronological medical events |
| `/api/medications` | GET | Session | Medications grouped by status |
| `/api/lab-results` | GET | Session | Lab results |
| `/api/lab-results/trends` | GET | Session | Aggregated trend series for Recharts |
| `/api/share` | POST | Session | Create a share |
| `/api/share` | GET | Session | List patient's shares |
| `/api/share/[token]/verify-pin` | POST | None | Verify PIN → issue short-lived share cookie |
| `/api/share/[token]/records` | GET | Share cookie | Return scoped records |
| `/api/share/[id]/revoke` | POST | Session | Revoke share |
| `/api/emergency` | POST | Session | Enable/disable emergency access |
| `/api/emergency/[token]` | GET | None | Public minimal emergency data |
| `/api/audit` | GET | Session | Patient's audit log |
| `/api/profile` | GET / POST | Session | Patient profile |
| `/api/ai-brief` | GET | Session | AI-generated visit brief |

---

## Security Architecture

```
Patient Browser
    │  HTTPS + Supabase JWT cookie
    ▼
Next.js Middleware  ──→  Protected App Routes
    │                         │
    │                   Supabase DB (RLS)
    │                   AI Provider (server only)

Clinician Browser
    │  /share/{token}
    ▼
PIN Verification Page
    │  POST /api/share/{token}/verify-pin
    │  → token hash check + bcrypt PIN check + expiry + revocation
    │  → Issues signed HttpOnly share_session cookie (1 h TTL)
    ▼
Clinician Records Page
    │  GET /api/share/{token}/records  [with share_session cookie]
    │  → Re-validates: cookie, token hash, expiry, revocation, scope
    │  → Returns ONLY the scoped subset
    ▼
Read-only Clinician View

Emergency Visitor
    │  /emergency/{token}
    ▼
Server checks expiry only → returns only explicitly authorised fields
```

**Key security properties:**
| Property | Implementation |
|---|---|
| Share tokens | `crypto.randomBytes(32)` → hex URL → SHA-256 hash stored in DB |
| PINs | `bcrypt(pin, 12)` — never logged, never returned to client |
| Share session | HttpOnly signed cookie, 1 h TTL, set after PIN verification |
| Per-request validation | Every clinician API call checks hash, PIN session, expiry, revocation, scope |
| RLS | Enabled on all patient tables — service role key used only server-side |
| Input validation | Zod on every API route — request and response |
| Clinician isolation | No patient IDs, unrelated records, or private storage paths ever sent |

---

## UI Pages — Detailed Breakdown

### Dashboard (Overview)

```
┌──────────────────────────────────────────────────────────┐
│  Good morning, Ananya 👋               [Upload Document] │
│  Your consolidated health record — 3 providers           │
├──────────┬──────────┬─────────────┬─────────────────────┤
│ 4 Active │ 1 Allergy│ 2 Conditions│ HbA1c 7.2%  ↑ HIGH │
│ Medica-  │ Known    │             │ (3 weeks ago)        │
│ tions    │          │             │                      │
├──────────┴──────────┴─────────────┴─────────────────────┤
│  ⚠ Alerts                                                │
│  • Possible duplicate: Metformin found in 2 records      │
│  • HbA1c tested 3 weeks ago — possible repeat test       │
│  • 2 extracted records awaiting your confirmation        │
├──────────────────────────────────────────────────────────┤
│  Recent Activity          │  Quick Actions               │
│  • 14 Oct — Lab Report    │  [Upload Document]           │
│  • 2 Oct — Prescription   │  [View Timeline]             │
│  • 28 Sep — Discharge     │  [Share Records]             │
│                           │  [Emergency Info]            │
└──────────────────────────────────────────────────────────┘
```

### Document Extraction Review

```
┌───────────────────┬─────────────────────────────────────┐
│                   │  Extracted Information               │
│  Document Preview │─────────────────────────────────────┤
│                   │ Document Type  [Lab Report      ▾]  │
│  (PDF embed /     │ Date           [14 Oct 2025      ]  │
│   image preview)  │ Provider       [Dr. Mehta        ]  │
│                   │─────────────────────────────────────┤
│                   │ Lab Results                         │
│                   │ ⚠ HbA1c  7.4%  (ref: <5.7%) HIGH  │
│                   │   Confidence: 72% — please verify   │
│                   │ ✓ Glucose  142 mg/dL                │
│                   │─────────────────────────────────────┤
│                   │  [Confirm & Save]      [Discard]    │
└───────────────────┴─────────────────────────────────────┘
```
Fields with `confidence < 0.7` are highlighted amber with an explicit "please verify" label.

### Clinician Share View (`/share/[token]`)

**Step 1** — PIN entry (no patient data visible until verified).
**Step 2** — After verification: professional read-only summary.

```
┌──────────────────────────────────────────────────────────┐
│ 🏥 Lost in Transit — Shared Health Summary               │
│ Patient: Ananya Rao  |  Share expires: 9 Nov 2025 18:00  │
├─────────────────────┬────────────────────────────────────┤
│ Chronic Conditions  │  Current Medications               │
│ • Type 2 Diabetes ✓ │  • Metformin 500mg BD  ✓          │
│ • Hypertension ✓    │  • Amlodipine 5mg OD  ✓           │
│                     │  • Atorvastatin 10mg OD  ✓        │
├─────────────────────┴────────────────────────────────────┤
│ Known Allergies: Penicillin (rash) — Patient confirmed   │
├──────────────────────────────────────────────────────────┤
│ Lab Trends — HbA1c                                       │
│  8 ┤ ●                                                   │
│  7 ┤    ●────●                                           │
│    └──Jan──Apr──Jul                                      │
├──────────────────────────────────────────────────────────┤
│ ⚠ Clinical Alerts (for review only — not diagnoses)     │
│ • Possible duplicate: Metformin in 2 source records      │
├──────────────────────────────────────────────────────────┤
│ AI-extracted fields marked ⬡  |  Verified fields ✓      │
│ This is not a substitute for clinical judgement.         │
│                                         [🖨 Print View]  │
└──────────────────────────────────────────────────────────┘
```

---

## Demo Mode

Activated when `NEXT_PUBLIC_DEMO_MODE=true` or Supabase env vars are absent.

| Behaviour | Detail |
|---|---|
| Banner | Persistent amber "Demo Mode — fictional data only" bar |
| Auth | "Continue as Demo Patient" button (local cookie, no real auth) |
| Data | Served from `lib/demo/data.ts` — static TypeScript objects |
| Upload | One-click "Load sample prescription" → synthetic extraction result |
| No network calls | Zero calls to Supabase or AI APIs |
| Labelling | All screens show demo watermark on clinical data |

---

## Seed Data — Ananya Rao (fictional)

> [!CAUTION]
> This is entirely fictional. No real patient data is used.

| Category | Detail |
|---|---|
| Patient | Ananya Rao, 52 y/o (DOB: 15 Mar 1973) |
| Conditions | Type 2 Diabetes (verified), Hypertension (verified) |
| Allergy | Penicillin → urticaria (patient-confirmed) |
| Medications | Metformin 500mg BD ✓, Amlodipine 5mg OD ✓, Atorvastatin 10mg OD ✓, **Metformin 1000mg OD** from second prescription (duplicate alert trigger) |
| Lab: HbA1c | Jan 2025: 7.8%, Apr 2025: 7.4%, Jul 2025: 7.2% (trend + repeat alert) |
| Lab: Other | TSH 2.1 mIU/L, RBS 142 mg/dL, Creatinine 0.9 mg/dL |
| Documents | 3 prescriptions (Apollo, Max, Fortis) + 2 lab reports |
| Shares | 1 active (all records, 30 days), 1 revoked |
| Providers | Dr. Priya Nair (Apollo), Dr. Arjun Mehta (Max), Dr. Shalini Iyer (Fortis) |

This seed produces:
- ✅ Duplicate medication alert (Metformin)
- ✅ HbA1c trend chart (3 data points)
- ✅ Repeat-test alert (HbA1c < 3 months apart)
- ✅ Populated dashboard, timeline, medication list
- ✅ Share + revoke demonstration

---

## Environment Variables

```env
# ─── Supabase ─────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://rvaxbmxddnrvwiqyzsyq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2YXhibXhkZG5ydndpcXl6c3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NTcyNjEsImV4cCI6MjEwNzEzMzI2MX0.y88UCo-r8JyBw4g5EkO7wxAKYfV4MkiDx8_-pps8CPw
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2YXhibXhkZG5ydndpcXl6c3lxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTU1NzI2MSwiZXhwIjoyMTA3MTMzMjYxfQ.jomu5wP9RrXQPjT_LF2NNWP4zj-iLnGKg9y-mXoy9SY      # Server-side only — never sent to browser

```env
# ─── AI Provider ──────────────────────────────────────────────────────────────
AI_PROVIDER=gemini                  # gemini | openai
GEMINI_API_KEY=
GEMINI_MODEL=
OPENAI_API_KEY=

# ─── OCR Configuration ───────────────────────────────────────────────────────
OCR_PROVIDER=paddleocr              # paddleocr | none
OCR_ENABLED=true

# ─── Document Upload ─────────────────────────────────────────────────────────
MAX_UPLOAD_SIZE_MB=5
```──────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEMO_MODE=false             # true = demo mode with fictional data

# ─── Security ─────────────────────────────────────────────────────────────────
SHARE_TOKEN_SECRET=<32+ random chars>   # HMAC secret for share session cookies
MAX_UPLOAD_SIZE_MB=5
```

---

## Testing Strategy

| Test file | Coverage |
|---|---|
| `__tests__/extraction.test.ts` | Valid AI responses pass schema; invalid responses are rejected |
| `__tests__/share-auth.test.ts` | Expired shares denied; revoked shares denied; bad PIN denied; scope filtering |
| `__tests__/duplicate.test.ts` | Medication name normalisation; lab repeat detection window |
| `__tests__/rls.test.ts` | Cross-patient access returns empty; service role correctly scoped |
| `__tests__/demo.test.ts` | All demo data objects match Zod schemas |

```bash
cd lost-in-transit
npm run test           # Jest unit + integration tests
npm run type-check     # tsc --noEmit
npm run lint           # ESLint
npm run build          # Production build check
```

---

## Implementation Phases

| Phase | Scope | Checkpoint |
|---|---|---|
| **0** | Project bootstrap, tooling, folder structure | `npm run dev` starts on port 3000 |
| **1** | DB schema, migrations, RLS, storage policies | All migrations apply without error |
| **2** | Auth (sign-up, sign-in, middleware, onboarding) | New patient can register and reach dashboard |
| **3** | App shell — sidebar, header, mobile nav, routing | All sidebar links navigate correctly |
| **4** | Document upload + AI extraction + review screen | Upload → extract → review → confirm flow works |
| **5** | Dashboard + unified timeline | Dashboard cards and timeline populated from DB |
| **6** | Medications page + lab results + trend charts | Duplicate alert visible; HbA1c chart renders |
| **7** | Record sharing + clinician view + PIN + revoke | Full share flow works end-to-end |
| **8** | Emergency card + audit log | Emergency QR generates; audit events recorded |
| **9** | Demo mode + seed data | Demo works with no credentials; Ananya Rao data visible |
| **10** | Tests + polish + README | All tests pass; no lint errors; build succeeds |

Each phase leaves the application in a runnable, non-broken state before the next begins.

---

## Verification Checklist

### Automated
```bash
npm run test && npm run type-check && npm run lint && npm run build
```

### Manual
- [ ] `npm run dev` starts — no console errors
- [ ] Sign-up → onboarding → dashboard shows empty state for new patient
- [ ] Upload prescription image → extraction review → confirm → timeline updated
- [ ] Demo mode banner visible when `NEXT_PUBLIC_DEMO_MODE=true`
- [ ] Ananya Rao: duplicate Metformin alert visible on dashboard
- [ ] Ananya Rao: HbA1c trend chart renders with 3 data points
- [ ] Ananya Rao: repeat-test alert for HbA1c
- [ ] Generate share → open in incognito → PIN gate → clinician view → revoke → retry → rejected
- [ ] Expired share token returns "This share has expired"
- [ ] Emergency card QR encodes correct URL
- [ ] Audit log records: upload, confirm, share create, access, revocation
- [ ] Cross-patient URL access returns 403 / empty result

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Next.js 14 App Router | Server components cut client JS; server actions simplify form handling |
| `@supabase/ssr` | Modern cookie-based session; deprecated `auth-helpers` avoided |
|Gemini Flash default — use a currently supported vision-capable model configured through GEMINI_MODEL; verify model availability before implementation.
| bcrypt for PINs | Industry-standard for low-rate human-entered secrets |
| SHA-256 for share token hash | Fast, sufficient for cryptographically random 32-byte tokens |
| HttpOnly share session cookie | Prevents token-in-URL caching/logging; re-validated each request |
| No RLS bypass for clinician access | Service role scopes data server-side; no raw DB access from browser |
| Demo mode as static TypeScript | No DB required for hackathon demo; type-safe; matches real schema shapes |
| `metadata: { is_demo: true }` on seed rows | Clearly marks fictional records; easy to filter or purge |
