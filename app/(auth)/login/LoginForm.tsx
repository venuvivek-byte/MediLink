"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, FlaskConical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { AppMode } from "@/lib/config/schema";
import { startDemoSessionAction } from "../actions";
import { GoogleButton, OrDivider } from "../GoogleButton";

export function LoginForm({ mode }: { mode: AppMode }) {
  return mode === "demo" ? <DemoLogin /> : <PasswordLogin />;
}

function DemoLogin() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg border border-health-amber/30 bg-health-amber/10 text-sm text-foreground/80 space-y-1">
        <p className="font-semibold">Demo mode</p>
        <p>
          You will see records for Ananya Rao, a fictional patient. All data is synthetic, no
          account is needed, and nothing is sent to external AI services.
        </p>
      </div>
      {error && <FormError message={error} />}
      <Button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await startDemoSessionAction();
            if (result?.error) setError(result.error);
          })
        }
        className="w-full h-10 gap-2 text-sm font-semibold"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
        Continue as demo patient
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Real accounts are disabled while DEMO_MODE=true.
      </p>
    </div>
  );
}

function PasswordLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const { error: authError } = await createClient().auth.signInWithPassword({ email, password });
      if (authError) {
        // Same message for unknown email and wrong password.
        setError("Incorrect email or password.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Sign-in failed. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {error && <FormError message={error} />}
      <GoogleButton />
      <OrDivider />
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="email" className="text-sm">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="text-sm h-9"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password" className="text-sm">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="text-sm h-9"
            required
          />
        </div>
        <Button type="submit" disabled={isLoading} className="w-full h-9 text-sm">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
      <div className="flex items-center justify-between text-sm text-muted-foreground pt-1">
        <span>Don&apos;t have an account?</span>
        <Link href="/signup" className="text-primary font-medium hover:underline">
          Create an account
        </Link>
      </div>
    </>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2"
    >
      <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
