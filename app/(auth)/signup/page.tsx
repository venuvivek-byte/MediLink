"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
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
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: fullName,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setIsLoading(false);
    } catch (err: any) {
      setError(err?.message || "Failed to create account.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-health-emerald items-center justify-center shadow-lg shadow-primary/20">
            <Heart className="w-6 h-6 text-white" fill="white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gradient">
            Lost in Transit
          </h1>
          <p className="text-xs text-muted-foreground">
            Create your patient-controlled health record account
          </p>
        </div>

        <Card className="border-border/80 shadow-md">
          <CardHeader className="pb-3 text-center">
            <CardTitle className="text-base font-semibold">Patient Registration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {success ? (
              <div className="p-4 rounded-xl bg-health-emerald/10 border border-health-emerald/30 text-health-emerald space-y-2 text-center text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto" />
                <h4 className="font-semibold text-sm">Account Created</h4>
                <p className="text-muted-foreground">
                  Check your inbox to verify your email, or proceed to sign in.
                </p>
                <div className="pt-2">
                  <Link href="/login">
                    <Button size="sm" className="w-full text-xs">
                      Go to Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Full Legal Name</Label>
                    <Input
                      placeholder="Ananya Rao"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="text-xs h-9"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      placeholder="patient@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-xs h-9"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Password</Label>
                    <Input
                      type="password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="text-xs h-9"
                      required
                      minLength={6}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full text-xs h-9 bg-primary"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Patient Account"
                    )}
                  </Button>
                </form>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>Already registered?</span>
                  <Link href="/login" className="text-primary font-medium hover:underline">
                    Sign In
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
