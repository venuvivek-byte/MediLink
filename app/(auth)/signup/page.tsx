import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getPublicConfig } from "@/lib/config/env";
import { Button } from "@/components/ui/button";
import { AuthCard } from "../AuthCard";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <Suspense fallback={<AuthCard title="Create your account" tagline="Loading…">{null}</AuthCard>}>
      <SignupContent />
    </Suspense>
  );
}

async function SignupContent() {
  if (await getSession()) redirect("/");
  const { mode } = getPublicConfig();

  if (mode === "demo") {
    return (
      <AuthCard title="Sign-up is disabled" tagline="Demo mode uses a fictional patient">
        <p className="text-xs text-muted-foreground">
          Accounts cannot be created while the app runs in demo mode. Use the demo patient instead.
        </p>
        <Link href="/login">
          <Button className="w-full h-9 text-sm">Back to demo sign-in</Button>
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create your account" tagline="Keep your medical records organised and under your control">
      <SignupForm />
    </AuthCard>
  );
}
