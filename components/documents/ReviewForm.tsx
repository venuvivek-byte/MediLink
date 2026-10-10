"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  FlaskConical,
  HelpCircle,
  Image as ImageIcon,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ILLEGIBLE_MARKER, type ReviewFlag } from "@/lib/ai/verify";
import { lookAlikeNames } from "@/lib/domain/lookalike";
import type { ReviewPayload } from "@/lib/documents/review-payload";
import type { ReviewSubmission } from "@/lib/documents/review-schema";

type Status = "active" | "historical" | "discontinued" | "unknown";

interface Field {
  key: string;
  label: string;
  type?: "text" | "date";
}

interface Item {
  uid: string;
  values: Record<string, string>;
  flags: ReviewFlag[];
  page: number;
  quote: string;
  status?: Status;
  /** Set when the patient explicitly checked a highlighted entry against the original. */
  checked: boolean;
}

type Original = ReviewPayload["original"];

/** Why an entry needs the patient's explicit decision, recomputed as they edit. */
export function attentionFor(item: Pick<Item, "values" | "flags">, isMedication: boolean, strict = false) {
  const illegible = Object.values(item.values).some((v) => ILLEGIBLE_MARKER.test(v));
  const lookAlikes = isMedication ? lookAlikeNames(item.values.name ?? "") : [];
  // The server's illegible flag is replaced by the live check, so fixing the text clears it.
  const flags = item.flags.filter((f) => f !== "illegible_text");
  // strict: read by the backup provider, which does not reliably mark unreadable text.
  return { flags, illegible, lookAlikes, needsDecision: strict || item.flags.length > 0 || illegible || lookAlikes.length > 0 };
}

const FLAG_TEXT: Record<ReviewFlag, string> = {
  quote_not_found: "The quoted text was not found in the document",
  value_not_found: "This value does not appear in the document",
  page_not_found: "Cited page does not exist",
  model_uncertain: "AI marked this as uncertain",
  illegible_text: "Part of this could not be read",
};

const MED_FIELDS: Field[] = [
  { key: "name", label: "Medicine" },
  { key: "strength", label: "Strength" },
  { key: "dosage", label: "Dose" },
  { key: "frequency", label: "Frequency" },
  { key: "duration", label: "Duration" },
  { key: "route", label: "Route" },
  { key: "instructions", label: "Instructions" },
];
const LAB_FIELDS: Field[] = [
  { key: "test_name", label: "Test" },
  { key: "value", label: "Result" },
  { key: "unit", label: "Unit" },
  { key: "reference_range", label: "Reference range (as printed)" },
  { key: "flag", label: "Flag (as printed, e.g. H or L)" },
  { key: "result_date", label: "Result date", type: "date" },
];
const CONDITION_FIELDS: Field[] = [{ key: "name", label: "Condition / diagnosis" }];
const ALLERGY_FIELDS: Field[] = [
  { key: "substance", label: "Allergy to" },
  { key: "reaction", label: "Reaction" },
];

let uidCounter = 0;
function toItems<T extends { evidence: { page: number; quote: string } }>(
  list: { item: T; flags: ReviewFlag[] }[],
  fields: Field[]
): Item[] {
  return list.map(({ item, flags }) => ({
    uid: `i${uidCounter++}`,
    values: Object.fromEntries(fields.map((f) => [f.key, String((item as Record<string, unknown>)[f.key] ?? "")])),
    flags,
    page: item.evidence.page,
    quote: item.evidence.quote,
    checked: false,
  }));
}

const nullable = (v: string) => (v.trim() === "" ? null : v.trim());

interface ReviewFormProps {
  review: ReviewPayload;
  onConfirm: (submission: ReviewSubmission) => Promise<{ ok: true } | { ok: false; error: string }>;
  onCancel: () => Promise<void> | void;
}

export function ReviewForm({ review, onConfirm, onCancel }: ReviewFormProps) {
  const v = review.verified;
  const [header, setHeader] = useState({
    document_type: v.header.document_type ?? "",
    document_date: v.header.document_date ?? "",
    provider_name: v.header.provider_name ?? "",
    facility_name: v.header.facility_name ?? "",
  });
  const [meds, setMeds] = useState<Item[]>(() =>
    toItems(v.medications, MED_FIELDS).map((i) => ({ ...i, status: "unknown" as Status }))
  );
  const [labs, setLabs] = useState(() => toItems(v.lab_results, LAB_FIELDS));
  const [conditions, setConditions] = useState(() => toItems(v.diagnoses, CONDITION_FIELDS));
  const [allergies, setAllergies] = useState(() => toItems(v.allergies, ALLERGY_FIELDS));
  const [activePage, setActivePage] = useState(review.pages[0]?.pageNumber ?? 1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dateAmbiguous = v.ambiguousDates.includes("document_date");

  const flaggedCount = useMemo(
    () =>
      [...meds.map((i) => [i, true] as const), ...[...labs, ...conditions, ...allergies].map((i) => [i, false] as const)].filter(
        ([i, isMed]) => attentionFor(i, isMed, review.readByBackup).needsDecision
      ).length,
    [meds, labs, conditions, allergies, review.readByBackup]
  );
  // Every highlighted entry must be explicitly checked or removed before saving,
  // and nothing containing "[illegible]" can be saved at all.
  const unresolved = useMemo(
    () =>
      [...meds.map((i) => [i, true] as const), ...[...labs, ...conditions, ...allergies].map((i) => [i, false] as const)].filter(
        ([i, isMed]) => {
          const a = attentionFor(i, isMed, review.readByBackup);
          return a.illegible || (a.needsDecision && !i.checked);
        }
      ).length,
    [meds, labs, conditions, allergies, review.readByBackup]
  );
  const [view, setView] = useState<"original" | "text">(review.original?.kind === "image" ? "original" : "text");

  const submit = () => {
    setError(null);
    const src = (i: Item) => ({ source_page: i.page, source_excerpt: i.quote });
    const submission: ReviewSubmission = {
      extractionId: review.extractionId,
      header: {
        document_type: (header.document_type || null) as ReviewSubmission["header"]["document_type"],
        document_date: nullable(header.document_date),
        provider_name: nullable(header.provider_name),
        facility_name: nullable(header.facility_name),
      },
      medications: meds.map((i) => ({
        name: i.values.name,
        strength: nullable(i.values.strength),
        dosage: nullable(i.values.dosage),
        frequency: nullable(i.values.frequency),
        duration: nullable(i.values.duration),
        route: nullable(i.values.route),
        instructions: nullable(i.values.instructions),
        status: i.status ?? "unknown",
        ...src(i),
      })),
      lab_results: labs.map((i) => ({
        test_name: i.values.test_name,
        value: nullable(i.values.value),
        unit: nullable(i.values.unit),
        reference_range: nullable(i.values.reference_range),
        flag: nullable(i.values.flag),
        result_date: nullable(i.values.result_date),
        ...src(i),
      })),
      conditions: conditions.map((i) => ({ name: i.values.name, ...src(i) })),
      allergies: allergies.map((i) => ({ substance: i.values.substance, reaction: nullable(i.values.reaction), ...src(i) })),
    };
    startTransition(async () => {
      const result = await onConfirm(submission);
      if (!result.ok) setError(result.error);
    });
  };

  const page = review.pages.find((p) => p.pageNumber === activePage);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-3 space-y-6">
        <Card className="border-health-amber/40">
          <CardContent className="p-4 space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">Review before saving</span>
              {review.isSimulated ? (
                <Badge variant="outline" className="border-health-amber/50 text-health-amber gap-1">
                  <FlaskConical className="w-3 h-3" aria-hidden="true" /> Simulated output (demo)
                </Badge>
              ) : (
                <Badge variant="outline">
                  Extracted by {review.provider} · {review.model}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Automatic extraction can be wrong. Check every entry against the document on the right. Nothing is added to
              your records until you confirm. Confirmed entries are marked &quot;patient-reviewed&quot;, which is not a
              clinical verification.
            </p>
            {review.readByBackup && (
              <p role="note" className="text-sm font-medium text-health-amber flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                The main reading service was unavailable, so a backup service read this document. The backup does not
                reliably mark words it cannot read, so every entry needs your check against the original.
              </p>
            )}
            {review.textReadByAi && (
              <p role="note" className="text-sm font-medium text-health-amber flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                The text of this scan or photo was read by AI. If it misread a word or number, the automatic checks
                cannot catch it, so compare names, doses and values with the original page.
              </p>
            )}
            {flaggedCount > 0 && (
              <p role="status" className="text-sm font-medium text-health-amber flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" /> {flaggedCount} entr
                {flaggedCount === 1 ? "y needs" : "ies need"} extra attention.
              </p>
            )}
            {v.unreadable_notes.length > 0 && (
              <ul className="text-sm text-muted-foreground list-disc pl-5">
                {v.unreadable_notes.map((n, i) => (
                  <li key={i}>Unreadable: {n}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Document details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="h-type" className="text-sm">Document type</Label>
              <select
                id="h-type"
                value={header.document_type}
                onChange={(e) => setHeader((h) => ({ ...h, document_type: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">Unknown</option>
                <option value="prescription">Prescription</option>
                <option value="lab_report">Lab report</option>
                <option value="discharge_summary">Discharge summary</option>
                <option value="other">Other</option>
              </select>
            </div>
            <TextField
              id="h-date"
              label="Document date"
              type="date"
              value={header.document_date}
              onChange={(value) => setHeader((h) => ({ ...h, document_date: value }))}
              warning={dateAmbiguous ? "The document's date is ambiguous (day and month could be swapped). Please check." : undefined}
            />
            <TextField id="h-provider" label="Doctor / provider" value={header.provider_name} onChange={(value) => setHeader((h) => ({ ...h, provider_name: value }))} />
            <TextField id="h-facility" label="Hospital / clinic / lab" value={header.facility_name} onChange={(value) => setHeader((h) => ({ ...h, facility_name: value }))} />
          </CardContent>
        </Card>

        <ItemSection title="Medications" fields={MED_FIELDS} items={meds} setItems={setMeds} onShowPage={setActivePage} original={review.original} strict={review.readByBackup} withStatus />
        <ItemSection title="Lab results" fields={LAB_FIELDS} items={labs} setItems={setLabs} onShowPage={setActivePage} original={review.original} strict={review.readByBackup} />
        <ItemSection title="Conditions / diagnoses" fields={CONDITION_FIELDS} items={conditions} setItems={setConditions} onShowPage={setActivePage} original={review.original} strict={review.readByBackup} />
        <ItemSection title="Allergies" fields={ALLERGY_FIELDS} items={allergies} setItems={setAllergies} onShowPage={setActivePage} original={review.original} strict={review.readByBackup} />

        {error && (
          <p role="alert" className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </p>
        )}
        {unresolved > 0 && (
          <p role="status" className="text-sm font-medium text-health-amber flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            {unresolved} highlighted entr{unresolved === 1 ? "y needs" : "ies need"} your decision before you can confirm.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button onClick={submit} disabled={pending || unresolved > 0} className="gap-1.5">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> {pending ? "Saving…" : "Confirm and add to my records"}
          </Button>
          <Button variant="outline" onClick={() => startTransition(async () => onCancel())} disabled={pending} className="gap-1.5">
            <X className="w-4 h-4" aria-hidden="true" /> Cancel import
          </Button>
        </div>
      </div>

      <aside className="xl:col-span-2" aria-label="Source document text">
        <Card className="xl:sticky xl:top-20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" aria-hidden="true" /> {review.documentName}
            </CardTitle>
            {review.pages.length > 1 && (
              <div role="tablist" aria-label="Pages" className="flex flex-wrap gap-1 pt-1">
                {review.pages.map((p) => (
                  <Button
                    key={p.pageNumber}
                    role="tab"
                    aria-selected={p.pageNumber === activePage}
                    size="sm"
                    variant={p.pageNumber === activePage ? "default" : "outline"}
                    className="h-9 text-sm"
                    onClick={() => setActivePage(p.pageNumber)}
                  >
                    Page {p.pageNumber}
                  </Button>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {review.original && (
              <div role="tablist" aria-label="View" className="flex gap-1">
                <Button
                  role="tab"
                  aria-selected={view === "original"}
                  size="sm"
                  variant={view === "original" ? "default" : "outline"}
                  className="h-9 text-sm gap-1"
                  onClick={() => setView("original")}
                >
                  <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" /> Original
                </Button>
                <Button
                  role="tab"
                  aria-selected={view === "text"}
                  size="sm"
                  variant={view === "text" ? "default" : "outline"}
                  className="h-9 text-sm gap-1"
                  onClick={() => setView("text")}
                >
                  <FileText className="w-3.5 h-3.5" aria-hidden="true" /> Text read
                </Button>
              </div>
            )}
            {review.original && view === "original" ? (
              <OriginalView original={review.original} page={activePage} large />
            ) : (
              <>
                <p className="text-xs text-muted-foreground">Text read from the document (page {activePage}).</p>
                <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/40 rounded-lg p-3 max-h-[60vh] overflow-auto">
                  {page?.text || "No text on this page."}
                </pre>
              </>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  warning,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date";
  warning?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-sm">{label}</Label>
        {value !== "" && (
          <button type="button" onClick={() => onChange("")} className="text-xs text-muted-foreground hover:text-foreground underline" aria-label={`Mark ${label} as unknown`}>
            Mark unknown
          </button>
        )}
      </div>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder="Unknown"
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 text-sm ${warning ? "border-health-amber" : ""}`}
        aria-describedby={warning ? `${id}-warn` : undefined}
      />
      {warning && (
        <p id={`${id}-warn`} className="text-xs text-health-amber flex items-center gap-1">
          <HelpCircle className="w-3 h-3" aria-hidden="true" /> {warning}
        </p>
      )}
    </div>
  );
}

/** The uploaded file itself: photos inline (same-origin route), PDFs in a new tab at the cited page. */
function OriginalView({ original, page, large = false }: { original: NonNullable<Original>; page: number; large?: boolean }) {
  if (original.kind === "pdf") {
    return (
      <a
        href={`${original.url}#page=${page}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-sm text-primary underline min-h-9"
      >
        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" /> Open the original PDF at page {page}
      </a>
    );
  }
  return (
    <a href={original.url} target="_blank" rel="noreferrer" className="block" aria-label="Open the original photo full size in a new tab">
      {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-checked bytes; must not go through the image optimizer */}
      <img
        src={original.url}
        alt="Original uploaded document"
        className={`w-full object-contain rounded-lg border bg-white ${large ? "max-h-[70vh]" : "max-h-96"}`}
      />
      <span className="text-xs text-muted-foreground">Tap to open full size and zoom.</span>
    </a>
  );
}

function ItemSection({
  title,
  fields,
  items,
  setItems,
  onShowPage,
  original,
  strict,
  withStatus = false,
}: {
  title: string;
  fields: Field[];
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  onShowPage: (page: number) => void;
  original: Original;
  strict: boolean;
  withStatus?: boolean;
}) {
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const update = (uid: string, patch: Partial<Item> | ((item: Item) => Partial<Item>)) =>
    setItems((list) => list.map((i) => (i.uid === uid ? { ...i, ...(typeof patch === "function" ? patch(i) : patch) } : i)));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {title} <span className="text-muted-foreground font-normal text-sm">({items.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 && <p className="text-sm text-muted-foreground">None found.</p>}
        {items.map((item, index) => {
          const attention = attentionFor(item, withStatus, strict);
          const open = attention.illegible || (attention.needsDecision && !item.checked);
          const originalShown = showOriginal[item.uid] ?? open;
          return (
          <fieldset
            key={item.uid}
            className={`rounded-xl border p-3 space-y-3 ${open ? "border-health-amber/60 bg-health-amber/5" : "border-border"}`}
          >
            <legend className="sr-only">{`${title} ${index + 1}`}</legend>
            {(attention.flags.length > 0 || attention.illegible || attention.lookAlikes.length > 0) && (
              <ul className="text-sm text-health-amber space-y-0.5">
                {attention.flags.map((f) => (
                  <li key={f} className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" /> {FLAG_TEXT[f]}
                  </li>
                ))}
                {attention.illegible && (
                  <li className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" /> Contains [illegible]: type what the document
                    says, or remove this entry
                  </li>
                )}
                {attention.lookAlikes.length > 0 && (
                  <li className="flex items-start gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-1" aria-hidden="true" />
                    <span>
                      Check carefully: this name is easily confused with <strong>{attention.lookAlikes.join(", ")}</strong>.
                      Compare it letter by letter with the original.
                    </span>
                  </li>
                )}
              </ul>
            )}
            {attention.needsDecision && original && originalShown && <OriginalView original={original} page={item.page} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fields.map((f) => (
                <TextField
                  key={f.key}
                  id={`${item.uid}-${f.key}`}
                  label={f.label}
                  type={f.type}
                  value={item.values[f.key]}
                  onChange={(value) => update(item.uid, (i) => ({ values: { ...i.values, [f.key]: value } }))}
                />
              ))}
              {withStatus && (
                <div className="space-y-1">
                  <Label htmlFor={`${item.uid}-status`} className="text-sm">Are you currently taking it?</Label>
                  <select
                    id={`${item.uid}-status`}
                    value={item.status}
                    onChange={(e) => update(item.uid, { status: e.target.value as Status })}
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="unknown">Not sure / not stated</option>
                    <option value="active">Yes, currently taking</option>
                    <option value="historical">No, past prescription</option>
                    <option value="discontinued">No, stopped</option>
                  </select>
                </div>
              )}
            </div>
            {attention.needsDecision && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-2">
                {!open ? (
                  <>
                    <span className="text-sm text-health-emerald flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> You checked this against the original
                    </span>
                    <Button type="button" size="sm" variant="ghost" className="h-9 text-sm gap-1" onClick={() => update(item.uid, { checked: false })}>
                      <Undo2 className="w-3.5 h-3.5" aria-hidden="true" /> Undo
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium w-full">Your decision is needed:</span>
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 text-sm gap-1"
                      disabled={attention.illegible}
                      onClick={() => update(item.uid, { checked: true })}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> I checked it, it&apos;s correct
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 text-sm gap-1"
                      onClick={() => setItems((list) => list.filter((i) => i.uid !== item.uid))}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> I can&apos;t read it, don&apos;t save
                    </Button>
                    {original && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-9 text-sm"
                        onClick={() => setShowOriginal((s) => ({ ...s, [item.uid]: !originalShown }))}
                      >
                        {originalShown ? "Hide original" : "Show original"}
                      </Button>
                    )}
                    <span className="text-xs text-muted-foreground w-full">
                      If something was misread, correct the fields above first. The original stays in your documents either way.
                    </span>
                  </>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <button type="button" className="text-primary underline text-left" onClick={() => onShowPage(item.page)}>
                Source: page {item.page} — “{item.quote.length > 60 ? `${item.quote.slice(0, 60)}…` : item.quote}”
              </button>
              <Button type="button" size="sm" variant="ghost" className="h-9 text-sm text-destructive gap-1" onClick={() => setItems((list) => list.filter((i) => i.uid !== item.uid))}>
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Remove
              </Button>
            </div>
          </fieldset>
          );
        })}
      </CardContent>
    </Card>
  );
}
