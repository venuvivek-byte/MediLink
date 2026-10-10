"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Calendar, CheckCircle2, Copy, Eye, Lock, Share2, XCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createShareAction, revokeShareAction } from "@/app/(app)/share/actions";
import type { ShareLinkSummary } from "@/lib/data/types";
import {
  SHAREABLE_CATEGORIES,
  SHARE_CATEGORY_LABELS,
  SHARE_EXPIRY_OPTIONS,
  type ShareState,
} from "@/lib/sharing/policy";
import { formatDateTime, humanize } from "@/lib/format";

type Category = (typeof SHAREABLE_CATEGORIES)[number];

export interface ShareListItem extends ShareLinkSummary {
  state: ShareState;
  locked: boolean;
}

interface ShareViewProps {
  shares: ShareListItem[];
  /** Present only in demo mode: the fixed, public demo link. */
  demo: { url: string; pin: string } | null;
}

export function ShareView({ shares, demo }: ShareViewProps) {
  return (
    <>
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Share2 className="w-4 h-4 text-primary" aria-hidden="true" />
            Create a share link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">{demo ? <DemoLink demo={demo} /> : <CreateShareForm />}</CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Your share links</CardTitle>
          <span className="text-sm text-muted-foreground">{shares.length} total</span>
        </CardHeader>
        <CardContent className="p-0">
          {shares.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">You have not shared any records.</p>
          ) : (
            <ul className="divide-y divide-border">
              {shares.map((s) => (
                <ShareRow key={s.id} share={s} canRevoke={!demo} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-9 text-sm shrink-0"
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
    >
      <Copy className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function CreateShareForm() {
  const router = useRouter();
  const id = useId();
  const [label, setLabel] = useState("");
  const [categories, setCategories] = useState<Category[]>(["allergies", "conditions", "medications"]);
  const [includeUnreviewed, setIncludeUnreviewed] = useState(false);
  const [expiryHours, setExpiryHours] = useState<number>(SHARE_EXPIRY_OPTIONS[1].hours);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ url: string; pin: string; expiresAt: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (c: Category) =>
    setCategories((list) => (list.includes(c) ? list.filter((x) => x !== c) : [...list, c]));

  if (created) {
    return (
      <div className="p-4 rounded-xl border border-health-emerald/30 bg-health-emerald/10 space-y-3" role="status">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-health-emerald" aria-hidden="true" /> Link created
        </p>
        <p className="text-sm flex items-start gap-1.5">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
          Copy the link and PIN now. They are shown only once and cannot be recovered; if you lose them, revoke this
          link and create a new one. Send the PIN separately from the link (for example, tell it in person).
        </p>
        <div className="flex items-center gap-2">
          <Input readOnly aria-label="Share link" value={created.url} className="text-sm h-9 font-mono bg-background" />
          <CopyButton value={created.url} label="Copy share link" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">PIN:</span>
          <span className="text-lg font-mono font-bold tracking-widest bg-background px-3 py-1 rounded border">{created.pin}</span>
          <CopyButton value={created.pin} label="Copy PIN" />
        </div>
        <div className="flex items-center gap-4">
          <div className="p-2 bg-white rounded-lg border">
            <QRCodeSVG value={created.url} size={96} aria-label="QR code for the share link" />
          </div>
          <p className="text-sm text-muted-foreground">Expires {formatDateTime(created.expiresAt)}.</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-9 text-sm" onClick={() => setCreated(null)}>
          Done
        </Button>
      </div>
    );
  }

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createShareAction({ label, categories, includeUnreviewed, expiryHours, consent });
      if (result.ok) {
        setCreated({ url: result.url, pin: result.pin, expiresAt: result.expiresAt });
        setLabel("");
        setConsent(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <p className="text-sm text-muted-foreground">
        The clinician opens the link, enters a 6-digit PIN, and sees a read-only summary of only what you choose
        below. You can revoke the link at any time; every visit and wrong PIN appears in your audit history.
      </p>
      <label className="block text-sm space-y-1" htmlFor={`${id}-label`}>
        <span className="font-medium">Who is this for? (optional)</span>
        <Input
          id={`${id}-label`}
          value={label}
          maxLength={100}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Dr. Mehta, cardiology follow-up"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">What to share</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SHAREABLE_CATEGORIES.map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm min-h-11 px-3 rounded-lg border cursor-pointer">
              <input type="checkbox" className="size-4" checked={categories.includes(c)} onChange={() => toggle(c)} />
              {SHARE_CATEGORY_LABELS[c]}
            </label>
          ))}
        </div>
        <label className="flex items-start gap-2 text-sm pt-1">
          <input
            type="checkbox"
            className="size-4 mt-0.5"
            checked={includeUnreviewed}
            onChange={(e) => setIncludeUnreviewed(e.target.checked)}
          />
          <span>
            Also include records I have not reviewed yet
            <span className="block text-muted-foreground">They are labelled &quot;pending review&quot; for the clinician.</span>
          </span>
        </label>
      </fieldset>

      <label className="block text-sm space-y-1" htmlFor={`${id}-expiry`}>
        <span className="font-medium">Link stops working after</span>
        <select
          id={`${id}-expiry`}
          value={expiryHours}
          onChange={(e) => setExpiryHours(Number(e.target.value))}
          className="w-full sm:w-60 h-9 rounded-md border bg-background px-2 text-sm text-foreground"
        >
          {SHARE_EXPIRY_OPTIONS.map((o) => (
            <option key={o.hours} value={o.hours}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="size-4 mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>I agree to share these records with whoever has this link and PIN until it expires or I revoke it.</span>
      </label>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="px-3.5" disabled={pending || !consent || categories.length === 0}>
        {pending ? "Creating…" : "Create link and PIN"}
      </Button>
    </form>
  );
}

function ShareRow({ share: s, canRevoke }: { share: ShareListItem; canRevoke: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const revoke = () => {
    setError(null);
    startTransition(async () => {
      const result = await revokeShareAction({ id: s.id });
      if (result.ok) {
        setConfirming(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  const status = s.state === "revoked" ? "Revoked" : s.state === "expired" ? "Expired" : s.locked ? "Paused (wrong PINs)" : "Active";

  return (
    <li className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="space-y-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm break-words">{s.label}</span>
          <Badge variant={s.locked && s.state === "active" ? "destructive" : "outline"} className="text-xs">
            {s.locked && s.state === "active" && <Lock className="w-3 h-3 mr-1" aria-hidden="true" />}
            {status}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
            {s.state === "revoked" ? `Revoked ${formatDateTime(s.revokedAt)}` : `Expires ${formatDateTime(s.expiresAt)}`}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            {s.lastAccessedAt ? `Last opened ${formatDateTime(s.lastAccessedAt)}` : "Not opened yet"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Includes: {s.categories.length ? s.categories.map(humanize).join(", ") : "nothing"}
          {s.includeUnreviewed ? " (including unreviewed records)" : " (reviewed records only)"}
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      {canRevoke && s.state === "active" && (
        <div className="flex gap-2 self-start sm:self-auto shrink-0">
          {confirming ? (
            <>
              <Button variant="destructive" size="sm" className="h-9 text-sm" disabled={pending} onClick={revoke}>
                {pending ? "Revoking…" : "Yes, revoke"}
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-sm" disabled={pending} onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="destructive" size="sm" className="h-9 text-sm gap-1" onClick={() => setConfirming(true)}>
              <XCircle className="w-3.5 h-3.5" aria-hidden="true" /> Revoke
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

function DemoLink({ demo }: { demo: { url: string; pin: string } }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Demo mode uses one fixed sample link and PIN for the fictional patient. Creating and revoking links needs a
        real account.
      </p>
      <Button onClick={() => setShow(true)} disabled={show} size="lg" className="px-3.5">
        Show demo share link
      </Button>
      {show && (
        <div className="p-4 rounded-xl border border-health-emerald/30 bg-health-emerald/10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-health-emerald" aria-hidden="true" /> Demo link
            </span>
            <span className="text-sm font-mono bg-background px-2 py-0.5 rounded border">Demo PIN: {demo.pin}</span>
          </div>
          <div className="flex items-center gap-2">
            <Input readOnly aria-label="Demo share link" value={demo.url} className="text-sm h-9 font-mono bg-background" />
            <CopyButton value={demo.url} label="Copy demo share link" />
          </div>
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white rounded-lg border">
              <QRCodeSVG value={demo.url} size={72} aria-label="QR code for the demo share link" />
            </div>
            <a href={demo.url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
              Open as a clinician
            </a>
          </div>
        </div>
      )}
    </>
  );
}
