# Deploying MyHealthVault to Vercel (real-user mode)

Production URL: `https://myhealthvault-beryl.vercel.app`
Vercel project: `myhealthvault`

## Environment variables (Production scope)

Never commit values. Set them with `npx vercel env add NAME production` and pipe the value on stdin.

| Name | Purpose |
| --- | --- |
| `DEMO_MODE` | `false`. Real-user mode: Supabase auth, no demo cookie or demo share tokens. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. Inlined into the client bundle at build time. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key; RLS protects data. Inlined at build time. |
| `SESSION_SECRET` | 32+ random characters used to sign app cookies. Production-only value; never reuse the local one. |
| `NEXT_PUBLIC_APP_URL` | Public base URL of the deployment (`https://myhealthvault-beryl.vercel.app`). Inlined at build time. |
| `AI_PROVIDER` | `none`. AI features are off. |
| `OCR_ENABLED` | `false`. |
| `OCR_PROVIDER` | `none`. |
| `MAX_UPLOAD_SIZE_MB` | `5` (the maximum the app allows). |

Do not set:
- `NEXT_PUBLIC_DEMO_MODE`: no longer read. The app rejects it at startup if `DEMO_MODE` is unset.
- `SUPABASE_SERVICE_ROLE_KEY`: no deployed code uses it yet (least privilege).
- `GEMINI_API_KEY` / `OPENAI_API_KEY`: not needed while `AI_PROVIDER=none`.

`NEXT_PUBLIC_*` values are compiled into the build. After you change one, you must redeploy.

Vercel CLI 63 will not save a `NEXT_PUBLIC_*` value that looks like a credential until you choose a type. The Supabase anon key is public by design and RLS protects the data, so add it with `--type config --yes` and pipe the value on stdin. Do not use `--value`, which puts the key on the command line.

```bash
<command that writes only the key to stdout> | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --type config --yes
```

Every other variable here was added as the default `Secret` type.

Variables are set for **Production only**. Preview deployments (for example from Git branches) get none of these variables. Without Supabase settings and `SESSION_SECRET`, they will fail the app's startup config check. Add Preview-scoped values (with a separate `SESSION_SECRET`) only if you want working previews.

## Project settings notes

- Framework preset: Next.js. Root directory: `.`.
- Linking the project also connected the GitHub repo `venuvivek-byte/MediLink`. With Vercel's Git integration, pushes to `main` deploy to production and other branches create preview deployments.
- Deployment Protection ("Vercel Authentication") covers the per-deployment `*-venuvivek-bytes-projects.vercel.app` URLs. The production alias is public.
- The project's Node.js version is currently 24.x. To pin 22.x, go to Project Settings, then Build and Deployment, then Node.js Version.

## Deploy and redeploy

From a clean checkout of `main`, with the project linked (`npx vercel link --yes --project myhealthvault`):

```bash
npm ci && npm run typecheck && npm run lint && npm test
npx vercel deploy --prod --yes
```

To rebuild the current production deployment without uploading code, run `npx vercel redeploy <deployment-url> --target production`.
Rollback: `npx vercel rollback <previous-deployment-url>`.

Check the runtime logs for the startup line
`[config] MyHealthVault starting in REAL-USER mode`:

```bash
npx vercel logs <deployment-url>
```

## Rotating SESSION_SECRET

Rotating the secret invalidates every cookie signed with the old value, so all users are signed out.

```bash
npx vercel env rm SESSION_SECRET production --yes
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64url'))" \
  | npx vercel env add SESSION_SECRET production
npx vercel deploy --prod --yes
```

The value goes straight from the generator into the CLI and is never printed.

## Post-deploy checklist (manual)

1. **Supabase**: Authentication, then URL Configuration.
   - Site URL: set it to `https://myhealthvault-beryl.vercel.app`, or keep localhost and add production as a redirect URL.
   - Redirect URLs: add `https://myhealthvault-beryl.vercel.app/auth/callback`. Keep `http://localhost:3000/auth/callback` for local development.
2. **Google Cloud Console**: APIs & Services, then Credentials, then the OAuth client.
   - Authorized JavaScript origins: add `https://myhealthvault-beryl.vercel.app`.
   - Authorized redirect URIs: leave unchanged. This stays the Supabase callback (`https://<project-ref>.supabase.co/auth/v1/callback`).
   - While the consent screen is in "Testing", only listed test users can sign in.
3. **Test sign-in**: open `https://myhealthvault-beryl.vercel.app/login`, choose "Continue with Google", sign in with a Google test user, and confirm you land on the dashboard.
4. **Smoke checks** (curl):
   - `GET /` with no cookie returns 307 to `/login`.
   - `GET /login` returns 200, shows "Continue with Google" and has no demo button.
   - `GET /medications` with `Cookie: patient_session=demo` redirects to `/login`.
   - `GET /share/x` and `GET /emergency/x` return a "not available" page.
   - `POST /api/documents/upload` with no session returns 401.
   - `POST /api/share/demo-clinician-share-token/verify-pin` returns 401.
   - `GET /auth/callback?code=x` redirects to `/login?error=oauth_failed`.
