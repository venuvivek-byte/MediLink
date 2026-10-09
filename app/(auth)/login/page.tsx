import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getPublicConfig } from "@/lib/config/env";
import { AuthCard } from "../AuthCard";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

const ERROR_MESSAGES: Record<string, string> = {
  confirmation_failed: "That confirmation link is invalid or has expired. Try signing in, or sign up again for a new link.",
  demo_mode: "Email confirmation is not used in demo mode.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<AuthCard title="Sign in" tagline="Loading…">{null}</AuthCard>}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({ searchParams }: { searchParams: SearchParams }) {
  // Verifies the session properly (unlike the optimistic proxy check).
  if (await getSession()) redirect("/");
  const { mode } = getPublicConfig();
  const errorKey = (await searchParams).error;
  const notice = typeof errorKey === "string" ? ERROR_MESSAGES[errorKey] : undefined;

  return (
    <AuthCard
      title={mode === "demo" ? "Explore the demo" : "Sign in to your records"}
      tagline="Your medical records, organised and under your control"
    >
      {notice && (
        <p role="alert" className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          {notice}
        </p>
      )}
      <LoginForm mode={mode} />
    </AuthCard>
  );
}
