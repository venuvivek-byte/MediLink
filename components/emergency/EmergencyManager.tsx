"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QrCode, RefreshCw, XCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrintButton } from "@/components/ui/PrintButton";
import {
  createEmergencyAccessAction,
  revokeEmergencyAccessAction,
  updateEmergencyAccessAction,
} from "@/app/(app)/emergency/actions";
import type { EmergencySettings } from "@/lib/data/types";
import { EMERGENCY_EXPIRY_OPTIONS } from "@/lib/sharing/policy";
import { formatDate, formatDateTime } from "@/lib/format";

interface Fields {
  showBloodGroup: boolean;
  showDateOfBirth: boolean;
  showAllergies: boolean;
  showConditions: boolean;
  showEmergencyContact: boolean;
  medicationIds: string[];
  patientNote: string;
}

const TOGGLES: { key: keyof Omit<Fields, "medicationIds" | "patientNote">; label: string }[] = [
  { key: "showAllergies", label: "Allergies" },
  { key: "showConditions", label: "Active conditions" },
  { key: "showBloodGroup", label: "Blood group" },
  { key: "showDateOfBirth", label: "Date of birth and age" },
  { key: "showEmergencyContact", label: "Emergency contact" },
];

interface EmergencyManagerProps {
  settings: EmergencySettings | null;
  url: string | null;
  medications: { id: string; name: string; current: boolean }[];
  demo: boolean;
}

function fieldsFrom(settings: EmergencySettings | null): Fields {
  return settings
    ? {
        showBloodGroup: settings.showBloodGroup,
        showDateOfBirth: settings.showDateOfBirth,
        showAllergies: settings.showAllergies,
        showConditions: settings.showConditions,
        showEmergencyContact: settings.showEmergencyContact,
        medicationIds: settings.medicationIds,
        patientNote: settings.patientNote ?? "",
      }
    : {
        // Nothing is shared until the patient ticks it.
        showBloodGroup: false,
        showDateOfBirth: false,
        showAllergies: false,
        showConditions: false,
        showEmergencyContact: false,
        medicationIds: [],
        patientNote: "",
      };
}

export function EmergencyManager({ settings, url, medications, demo }: EmergencyManagerProps) {
  const router = useRouter();
  const id = useId();
  const [fields, setFields] = useState<Fields>(() => fieldsFrom(settings));
  const [expiryDays, setExpiryDays] = useState<number>(EMERGENCY_EXPIRY_OPTIONS[2].days);
  const [consent, setConsent] = useState(false);
  const [confirm, setConfirm] = useState<"replace" | "off" | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: true } | { ok: false; error: string }>, done: string) => {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setConfirm(null);
        setConsent(false);
        setMessage({ kind: "ok", text: done });
        router.refresh();
      } else {
        setMessage({ kind: "error", text: result.error });
      }
    });
  };

  const payload = { ...fields, medicationIds: fields.medicationIds.filter((m) => medications.some((x) => x.id === m)) };
  const create = () =>
    run(() => createEmergencyAccessAction({ ...payload, expiryDays, consent }), settings ? "New link created. Your old QR code no longer works." : "Emergency link created.");

  const toggleMedication = (medId: string) =>
    setFields((f) => ({
      ...f,
      medicationIds: f.medicationIds.includes(medId) ? f.medicationIds.filter((x) => x !== medId) : [...f.medicationIds, medId],
    }));

  const formFields = (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Show to a first responder (your name is always shown)</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TOGGLES.map((t) => (
            <label key={t.key} className="flex items-center gap-2 text-sm min-h-11 px-3 rounded-lg border cursor-pointer">
              <input
                type="checkbox"
                className="size-4"
                checked={fields[t.key]}
                onChange={(e) => setFields((f) => ({ ...f, [t.key]: e.target.checked }))}
              />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      {medications.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Medications to show</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {medications.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm min-h-11 px-3 rounded-lg border cursor-pointer">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={fields.medicationIds.includes(m.id)}
                  onChange={() => toggleMedication(m.id)}
                />
                <span className="min-w-0 break-words">
                  {m.name}
                  {!m.current && <span className="text-muted-foreground"> (not marked current)</span>}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="block text-sm space-y-1" htmlFor={`${id}-note`}>
        <span className="font-medium">Note for responders (optional)</span>
        <textarea
          id={`${id}-note`}
          value={fields.patientNote}
          maxLength={500}
          rows={3}
          onChange={(e) => setFields((f) => ({ ...f, patientNote: e.target.value }))}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="e.g. Type 1 diabetic, insulin pump on left side."
        />
        <span className="text-xs text-muted-foreground">{fields.patientNote.length}/500</span>
      </label>
    </div>
  );

  const expiryAndConsent = (
    <div className="space-y-3">
      <label className="block text-sm space-y-1" htmlFor={`${id}-expiry`}>
        <span className="font-medium">Link stops working after</span>
        <select
          id={`${id}-expiry`}
          value={expiryDays}
          onChange={(e) => setExpiryDays(Number(e.target.value))}
          className="w-full sm:w-60 h-9 rounded-md border bg-background px-2 text-sm text-foreground"
        >
          {EMERGENCY_EXPIRY_OPTIONS.map((o) => (
            <option key={o.days} value={o.days}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="size-4 mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          I understand that anyone who scans this QR code or has the link can see the information I ticked above,
          without a PIN, until it expires or I turn it off.
        </span>
      </label>
    </div>
  );

  const feedback = message && (
    <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? "text-sm text-destructive" : "text-sm text-health-emerald"}>
      {message.text}
    </p>
  );

  if (!settings || !url) {
    if (demo) return <p className="text-sm text-muted-foreground">Emergency links need a real account.</p>;
    return (
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <p className="text-sm text-muted-foreground">
          Create a link and QR code you can print or keep on your phone&apos;s lock screen. It shows only what you
          tick below. Every scan is recorded in your audit history.
        </p>
        {formFields}
        {expiryAndConsent}
        {feedback}
        <Button type="submit" size="lg" className="px-3.5" disabled={pending || !consent}>
          {pending ? "Creating…" : "Create emergency link"}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="p-2 bg-white rounded-lg border self-start">
          <QRCodeSVG value={url} size={128} aria-label="QR code for your emergency link" />
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          <Input readOnly aria-label="Emergency link" value={url} className="text-sm font-mono bg-muted" />
          <p className="text-sm text-muted-foreground">
            Expires {formatDate(settings.expiresAt)} ·{" "}
            {settings.lastAccessedAt ? `Last opened ${formatDateTime(settings.lastAccessedAt)}` : "Not opened yet"}
          </p>
          <div className="flex flex-wrap gap-2">
            <a href={url} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm", variant: "outline", className: "h-9" })}>
              <QrCode className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Open responder view
            </a>
            <PrintButton label="Print card" />
          </div>
        </div>
      </div>

      {demo ? (
        <p className="text-sm text-muted-foreground">This read-only example has one fixed emergency link; settings cannot be changed.</p>
      ) : (
        <>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => updateEmergencyAccessAction(payload), "Saved. Your QR code is unchanged.");
            }}
          >
            {formFields}
            <Button type="submit" size="sm" className="h-9 text-sm" disabled={pending}>
              {pending && !confirm ? "Saving…" : "Save changes"}
            </Button>
          </form>

          {feedback}

          <div className="border-t border-border pt-4 space-y-3">
            {confirm === "replace" ? (
              <form
                className="space-y-3 p-3 rounded-lg border bg-muted/30"
                onSubmit={(e) => {
                  e.preventDefault();
                  create();
                }}
              >
                <p className="text-sm font-medium">
                  A new link replaces this one. Printed cards with the old QR code stop working immediately.
                </p>
                {expiryAndConsent}
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="h-9 text-sm" disabled={pending || !consent}>
                    {pending ? "Replacing…" : "Replace link"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-9 text-sm" onClick={() => setConfirm(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : confirm === "off" ? (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                <p className="text-sm font-medium">Turn off the emergency link? The QR code stops working immediately.</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-9 text-sm"
                    disabled={pending}
                    onClick={() => run(() => revokeEmergencyAccessAction(), "Emergency link turned off.")}
                  >
                    {pending ? "Turning off…" : "Yes, turn off"}
                  </Button>
                  <Button size="sm" variant="outline" className="h-9 text-sm" onClick={() => setConfirm(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="h-9 text-sm gap-1" onClick={() => setConfirm("replace")}>
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Replace link (new QR code)
                </Button>
                <Button size="sm" variant="destructive" className="h-9 text-sm gap-1" onClick={() => setConfirm("off")}>
                  <XCircle className="w-3.5 h-3.5" aria-hidden="true" /> Turn off
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
