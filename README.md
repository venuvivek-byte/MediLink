# MediLink (Lost in Transit) 🏥

> **Patient-Controlled Health-Record Platform & Unified Clinical Timeline**

MediLink is a full-stack HealthTech platform built to solve fragmented medical histories, repeat diagnostic testing, and uncoordinated care.

---

## 🌟 Core Features

- **AI Medical Document Extraction**: Ingests prescriptions, lab PDFs, and discharge summaries via Google Gemini 2.0 Flash Vision and local OCR.
- **Unified Longitudinal Health Timeline**: Chronological clinical events normalized across multiple hospitals, diagnostic labs, and clinics.
- **Medication Management & Duplicate Detection**: Automatically identifies duplicate prescriptions (e.g. Metformin prescribed across multiple providers).
- **Biomarker Trends & Repeat Test Alerts**: Interactive Recharts trendlines for HbA1c with interval detection (<90 days repeat alert).
- **Consent-Scoped Clinician Sharing**: Generate expiring, time-bound share links protected by server-hashed 6-digit PINs (`bcrypt`).
- **Emergency Medical Card**: Digital paramedic card and QR code for rapid emergency triage.
- **Tamper-Evident Audit Trail**: Complete audit logging of all uploads, views, shares, and external access events.
- **Zero-Knowledge Architecture**: Row Level Security (RLS) on all Supabase tables, private storage buckets, and zero plaintext PIN storage.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database & Storage**: Supabase (PostgreSQL with RLS)
- **AI / Vision**: Google Gemini 2.0 Flash (`@google/generative-ai`) / OpenAI GPT-4o
- **Visualizations**: Recharts
- **QR Generator**: `qrcode.react`
- **Security**: `bcryptjs` + crypto SHA-256 tokens

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/venuvivek-byte/MediLink.git
cd MediLink
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials and Gemini API Key:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-key
NEXT_PUBLIC_DEMO_MODE=true
```

### 3. Database Setup (Supabase CLI)

MediLink includes the **Supabase CLI** as a project dependency with convenient npm scripts.

#### Option A: Remote Supabase Project (Recommended)
1. **Link your Supabase project**:
   ```bash
   npm run supabase -- link --project-ref <your-project-ref>
   ```
2. **Push database migrations** (`001_initial_schema.sql` and `002_storage.sql`):
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

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- **Demo Patient**: Ananya Rao
- **Clinician Portal PIN**: `482910`
- **Demo Mode**: Set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local` to explore the complete feature set without configuring a database.
