import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getPublicConfig } from "@/lib/config/env";
import { AuthCard } from "../AuthCard";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthCard title="Sign in" tagline="Loading…">{null}</AuthCard>}>
      <LoginContent />
    </Suspense>
  );
}

async function LoginContent() {
  // Verifies the session properly (unlike the optimistic proxy check).
  if (await getSession()) redirect("/");
  const { mode } = getPublicConfig();

  return (
    <AuthCard
      title={mode === "demo" ? "Explore the demo" : "Sign in to your records"}
      tagline="Your medical records, organised and under your control"
    >
      <LoginForm mode={mode} />
    </AuthCard>
  );
}
