"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfileAction } from "@/app/(app)/settings/actions";
import type { PatientProfile } from "@/lib/data/types";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function ProfileForm({ profile, readOnly }: { profile: PatientProfile; readOnly: boolean }) {
  const router = useRouter();
  const id = useId();
  const [values, setValues] = useState({
    displayName: profile.displayName,
    dateOfBirth: profile.dateOfBirth ?? "",
    bloodGroup: profile.bloodGroup ?? "",
    contactName: profile.emergencyContact?.name ?? "",
    contactPhone: profile.emergencyContact?.phone ?? "",
    contactRelationship: profile.emergencyContact?.relationship ?? "",
  });
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const field = (key: keyof typeof values, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block text-sm space-y-1" htmlFor={`${id}-${key}`}>
      <span className="font-medium">{label}</span>
      <Input id={`${id}-${key}`} value={values[key]} onChange={set(key)} disabled={readOnly} {...props} />
    </label>
  );

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        startTransition(async () => {
          const result = await updateProfileAction(values);
          if (result.ok) {
            setMessage({ kind: "ok", text: "Profile saved." });
            router.refresh();
          } else {
            setMessage({ kind: "error", text: result.error });
          }
        });
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {field("displayName", "Name", { required: true, maxLength: 120, autoComplete: "name" })}
        {field("dateOfBirth", "Date of birth", { type: "date", autoComplete: "bday" })}
        <label className="block text-sm space-y-1" htmlFor={`${id}-bloodGroup`}>
          <span className="font-medium">Blood group</span>
          <select
            id={`${id}-bloodGroup`}
            value={values.bloodGroup}
            onChange={set("bloodGroup")}
            disabled={readOnly}
            className="w-full h-9 rounded-md border bg-background px-2 text-sm text-foreground"
          >
            <option value="">Not recorded</option>
            {BLOOD_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Emergency contact</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {field("contactName", "Name", { maxLength: 120 })}
          {field("contactPhone", "Phone", { type: "tel", maxLength: 40, inputMode: "tel" })}
          {field("contactRelationship", "Relationship (optional)", { maxLength: 60 })}
        </div>
        <p className="text-xs text-muted-foreground">Leave name and phone empty to remove the contact.</p>
      </fieldset>

      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? "text-sm text-destructive" : "text-sm text-health-emerald"}>
          {message.text}
        </p>
      )}
      {readOnly ? (
        <p className="text-sm text-muted-foreground">Read-only example: the profile cannot be changed.</p>
      ) : (
        <Button type="submit" size="sm" className="h-9 text-sm" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      )}
    </form>
  );
}
