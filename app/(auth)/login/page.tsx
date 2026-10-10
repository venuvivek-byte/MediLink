import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getPublicConfig } from "@/lib/config/env";
import { LandingHero } from "./LandingHero";
import { LandingContent } from "./LandingContent";

export const metadata = {
  title: "Your health. One secure place — MediLink",
  description:
    "Every prescription, report, and medical visit. Organized, accessible, and always within reach.",
};

const ERROR_MESSAGES: Record<string, string> = {
  email_confirmed_sign_in: "Your email is confirmed. Please sign in.",
  email_link_invalid:
    "That confirmation link is invalid or has expired. Try signing in, or sign up again for a new link.",
  demo_mode: "Account sign-in is not used in demo mode.",
  oauth_cancelled: "Google sign-in was cancelled.",
  oauth_failed: "Google sign-in did not complete. Please try again.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-slate-900 animate-pulse" />}>
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
    <div className="min-h-screen flex flex-col w-full overflow-x-hidden">
      <LandingHero mode={mode} />
      <LandingContent mode={mode} notice={notice} />
    </div>
  );
}
