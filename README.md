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

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- **Demo Patient**: Ananya Rao
- **Clinician Portal PIN**: `482910`
