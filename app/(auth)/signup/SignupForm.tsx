"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { GoogleButton, OrDivider } from "../GoogleButton";

const MIN_PASSWORD_LENGTH = 8;

export function SignupForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const { error: signUpError } = await createClient().auth.signUp({
        email,
        password,
        options: {
          data: { display_name: fullName.trim() },
          // Default Supabase confirmation email -> verify -> back here with a PKCE code.
          emailRedirectTo: `${window.location.origin}/auth/callback?flow=email`,
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      setSuccess(true);
    } catch {
      setError("Could not create the account. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div role="status" className="p-4 rounded-xl bg-health-emerald/10 border border-health-emerald/30 space-y-2 text-center text-xs">
        <CheckCircle2 className="w-8 h-8 mx-auto text-health-emerald" aria-hidden="true" />
        <h2 className="font-semibold text-sm">Check your email</h2>
        <p className="text-muted-foreground">
          If email confirmation is enabled, confirm your address before signing in.
        </p>
        <Link href="/login">
          <Button size="sm" className="w-full text-xs mt-2">Go to sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div role="alert" className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      <GoogleButton label="Sign up with Google" />
      <OrDivider />
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="fullName" className="text-xs">Full name</Label>
          <Input
            id="fullName"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="text-sm h-9"
            maxLength={120}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email" className="text-xs">Email</Label>
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
          <Label htmlFor="password" className="text-xs">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="text-sm h-9"
            minLength={MIN_PASSWORD_LENGTH}
            aria-describedby="password-hint"
            required
          />
          <p id="password-hint" className="text-[11px] text-muted-foreground">
            At least {MIN_PASSWORD_LENGTH} characters.
          </p>
        </div>
        <Button type="submit" disabled={isLoading} className="w-full h-9 text-sm">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
        <span>Already registered?</span>
        <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
      </div>
    </>
  );
}
