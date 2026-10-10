"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PinForm({ token }: { token: string }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/share/${encodeURIComponent(token)}/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "This link or PIN is not valid.");
        return;
      }
      // The server set an HttpOnly cookie; re-render the page with access.
      router.refresh();
    } catch {
      setError("Could not check the PIN. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="pin" className="sr-only">PIN</Label>
        <Input
          id="pin"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="text-center text-lg tracking-widest font-mono h-12"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "pin-error" : undefined}
          required
        />
      </div>
      {error && (
        <p id="pin-error" role="alert" className="text-sm text-destructive text-center font-medium">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending || pin.length !== 6}>
        {pending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : "View summary"}
      </Button>
    </form>
  );
}
