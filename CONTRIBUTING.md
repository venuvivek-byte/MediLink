# Contributing to MediLink

Thank you for your interest in contributing to MediLink! We are building a patient-controlled, privacy-first health record vault, and we welcome contributions from the community.

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free experience for everyone. Please be respectful and constructive in all discussions, pull requests, and issue reports.

---

## Development Setup

1. **Fork and Clone the Repository**:
   ```bash
   git clone https://github.com/venuvivek-byte/MediLink.git
   cd MediLink
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env.local
   ```
   For local development without any cloud accounts, keep `DEMO_MODE=true`.

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Development Rules & Best Practices

To maintain data safety, privacy, and clinical traceability, please adhere to these core principles:

1. **Never edit an applied database migration**:
   Migrations `001` through `008` in `supabase/migrations/` are applied to production. Always create a new sequential migration (`009_...sql`) for schema updates.
2. **Re-check sessions on every action**:
   Never assume the caller is authorized just because a page rendered. Every Server Action and API Route handler must re-verify authentication using `lib/auth/session.ts`.
3. **No untrusted AI data**:
   AI extractions must remain unconfirmed until explicitly reviewed by the patient. The pipeline must enforce verbatim evidence validation against the source document.
4. **Independent tests**:
   Tests must never depend on `.env.local`. Use `tests/helpers/env.ts` to mock environment variables.
5. **Quality gate before commits**:
   Before submitting any commit or opening a Pull Request, ensure all checks pass:
   ```bash
   npm run check
   ```
   This runs TypeScript type checking (`tsc --noEmit`), ESLint, Vitest test suite, and the production Next.js build.

---

## Pull Request Guidelines

1. **Create a branch**:
   Use descriptive branch names (e.g., `feat/azure-ocr`, `fix/upload-timeout`, `docs/setup-guide`).
2. **Keep PRs focused**:
   Submit small, atomic pull requests that address a single concern or feature.
3. **Write tests**:
   Add unit or integration tests in `tests/` for any new logic, endpoints, or data transformations.
4. **Document changes**:
   Update documentation in `docs/` or inline code comments when modifying architecture or configuration options.

---

## Reporting Issues & Security Disclosures

- **Bug Reports & Feature Requests**: Open an issue on GitHub describing the behavior, reproduction steps, and expected outcome.
- **Security Vulnerabilities**: If you discover a security vulnerability (especially regarding patient data isolation, RLS bypasses, or token leakage), please reach out directly to the maintainers rather than creating a public issue.
