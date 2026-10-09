"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Sparkles, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleDemoLogin = () => {
    router.push("/");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/");
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
            Patient-controlled health record repository & clinical timeline
          </p>
        </div>

        <Card className="border-border/80 shadow-md">
          <CardHeader className="pb-3 text-center">
            <CardTitle className="text-base font-semibold">Sign in to your records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  placeholder="ananya.rao@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <Button type="submit" className="w-full text-xs h-9 bg-primary">
                Sign In
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground text-[10px]">
                  Quick Evaluation
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleDemoLogin}
              className="w-full border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary text-xs h-10 gap-2 font-semibold"
            >
              <Sparkles className="w-4 h-4" />
              Continue as Demo Patient (Ananya Rao)
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Built with Zero-Knowledge Consent & End-to-End Privacy
        </p>
      </div>
    </div>
  );
}
