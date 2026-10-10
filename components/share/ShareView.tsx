"use client";

import { useState } from "react";
import { Calendar, CheckCircle2, Copy, Info, Share2, XCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ShareLinkSummary } from "@/lib/data/types";
import type { ShareState } from "@/lib/sharing/policy";
import { formatDate, humanize } from "@/lib/format";

interface ShareViewProps {
  shares: (ShareLinkSummary & { state: ShareState })[];
  /** Present only in demo mode: the fixed, public demo link. */
  demo: { url: string; pin: string } | null;
}

export function ShareView({ shares: initialShares, demo }: ShareViewProps) {
  const [shares, setShares] = useState(initialShares);
  const [showDemoLink, setShowDemoLink] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <>
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Share2 className="w-4 h-4 text-primary" aria-hidden="true" />
            Create a share link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {demo ? (
            <>
              <p className="text-sm text-muted-foreground">
                Demo mode uses one fixed sample link and PIN for the fictional patient. Choosing what to share, expiry
                and real link generation are not available in the demo.
              </p>
              <Button onClick={() => setShowDemoLink(true)} disabled={showDemoLink} size="lg" className="px-3.5">
                Show demo share link
              </Button>
              {showDemoLink && (
                <div className="p-4 rounded-xl border border-health-emerald/30 bg-health-emerald/10 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-health-emerald" aria-hidden="true" /> Demo link
                    </span>
                    <span className="text-sm font-mono bg-background px-2 py-0.5 rounded border">
                      Demo PIN: {demo.pin}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input readOnly aria-label="Demo share link" value={demo.url} className="text-sm h-9 font-mono bg-background" />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 text-sm shrink-0"
                      onClick={async () => {
                        await navigator.clipboard.writeText(demo.url);
                        setCopied(true);
                      }}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> {copied ? "Copied" : "Copy"}
                    </Button>
                    <a href={demo.url} target="_blank" rel="noreferrer">
                      <Button size="sm" className="h-9 text-sm shrink-0">Open</Button>
                    </a>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white rounded-lg border">
                      <QRCodeSVG value={demo.url} size={72} aria-label="QR code for the demo share link" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The clinician opens the link and enters the PIN to see a read-only summary.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p role="note" className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Info className="w-4 h-4" aria-hidden="true" />
              Creating share links is not available yet.
            </p>
          )}
        </CardContent>
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
              {shares.map((s) => {
                return (
                  <li key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{s.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {s.state === "revoked" ? "Revoked" : s.state === "expired" ? "Expired" : "Active"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                          {s.state === "revoked" ? `Revoked ${formatDate(s.revokedAt)}` : `Expires ${formatDate(s.expiresAt)}`}
                        </span>
                        <span>
                          Includes: {s.categories.length ? s.categories.map(humanize).join(", ") : "nothing"}
                        </span>
                      </div>
                    </div>
                    {demo && s.state === "active" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-9 text-sm gap-1 self-start sm:self-auto"
                        onClick={() =>
                          setShares((list) =>
                            list.map((x) => (x.id === s.id ? { ...x, state: "revoked", revokedAt: new Date().toISOString() } : x))
                          )
                        }
                      >
                        <XCircle className="w-3.5 h-3.5" aria-hidden="true" /> Revoke (demo, not saved)
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
