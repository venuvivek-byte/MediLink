// Renders the "Try sample" patient's original documents (one-page PDFs) from
// lib/demo/sample/data.ts, so every value shown in the app matches its source.
// Re-run after editing the sample data, then commit lib/demo/sample/files/:
//
//   node --experimental-strip-types scripts/sample/generate-files.mjs
//
// Output is deterministic (no timestamps), so an unchanged dataset produces
// byte-identical files.
import fs from "node:fs";
import path from "node:path";
import { SAMPLE_DOCUMENTS, SAMPLE_MEDICATION_SPECS, SAMPLE_PROFILE } from "../../lib/demo/sample/data.ts";

const OUT = path.join(process.cwd(), "lib", "demo", "sample", "files");
const W = 595;
const H = 842;
const M = 50;

const BRAND = {
  "Metro Diagnostics Lab": [0.05, 0.36, 0.55],
  "Riverside Hospital Laboratory": [0.36, 0.2, 0.5],
  "Sunrise Endocrine Clinic": [0.8, 0.42, 0.1],
  "Lakeview Neuro Centre": [0.1, 0.45, 0.4],
  "Greenleaf Family Clinic": [0.2, 0.5, 0.2],
  "Riverside Gastro Care": [0.36, 0.2, 0.5],
};
const TITLES = { lab_report: "LABORATORY REPORT", prescription: "PRESCRIPTION", discharge_summary: "DAY-CARE DISCHARGE SUMMARY" };

/** WinAnsi-safe text: ASCII only, PDF string escapes applied. */
const pdfText = (s) =>
  String(s)
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/[\\()]/g, (c) => `\\${c}`);

const ageOn = (dob, date) => {
  const [by, bm, bd] = dob.split("-").map(Number);
  const [y, m, d] = date.split("-").map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
};

const fmtDate = (iso) => {
  const [y, m, d] = iso.split("-");
  return `${d}-${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1]}-${y}`;
};

/** Wraps text to a maximum character width (Helvetica 10pt ~ 95 chars across the page). */
const wrap = (text, max) => {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    if ((line + " " + word).trim().length > max) {
      lines.push(line);
      line = word;
    } else line = (line + " " + word).trim();
  }
  if (line) lines.push(line);
  return lines;
};

function renderPage(doc) {
  const ops = [];
  const color = BRAND[doc.facility] ?? [0.2, 0.3, 0.4];
  const fill = (rgb) => ops.push(`${rgb.join(" ")} rg`);
  const stroke = (rgb) => ops.push(`${rgb.join(" ")} RG`);
  const text = (x, y, s, { size = 10, bold = false, rgb = [0.1, 0.1, 0.1] } = {}) => {
    fill(rgb);
    ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${pdfText(s)}) Tj ET`);
  };
  const rule = (y, rgb = [0.8, 0.8, 0.8], width = 0.6) => {
    stroke(rgb);
    ops.push(`${width} w ${M} ${y} m ${W - M} ${y} l S`);
  };

  // Letterhead band
  fill(color);
  ops.push(`0 ${H - 96} ${W} 96 re f`);
  text(M, H - 48, doc.facility, { size: 20, bold: true, rgb: [1, 1, 1] });
  text(M, H - 68, doc.address, { size: 9, rgb: [1, 1, 1] });
  text(M, H - 82, "Tel: +91 44 0000 0000  |  This is a synthetic sample document", { size: 8, rgb: [0.92, 0.92, 0.92] });

  let y = H - 128;
  text(M, y, TITLES[doc.type], { size: 13, bold: true, rgb: color });
  text(W - M - 120, y, `Date: ${fmtDate(doc.date)}`, { size: 10, bold: true });
  y -= 14;
  rule(y);

  // Patient block
  y -= 20;
  text(M, y, "Patient:", { bold: true });
  text(M + 92, y, SAMPLE_PROFILE.display_name);
  text(M + 260, y, "Age / Sex:", { bold: true });
  text(M + 320, y, `${ageOn(SAMPLE_PROFILE.date_of_birth, doc.date)} Y / F`);
  y -= 16;
  text(M, y, doc.type === "lab_report" ? "Reported by:" : "Doctor:", { bold: true });
  text(M + 92, y, doc.provider);
  text(M + 260, y, "Ref. No:", { bold: true });
  text(M + 320, y, `MHV-${doc.id.slice(-4).toUpperCase()}`);
  y -= 14;
  rule(y);

  if (doc.labs?.length) {
    const cols = [M, M + 190, M + 270, M + 340, M + 450];
    y -= 22;
    fill([0.95, 0.96, 0.97]);
    ops.push(`${M} ${y - 6} ${W - 2 * M} 20 re f`);
    ["Test", "Result", "Unit", "Reference range", "Flag"].forEach((h, i) => text(cols[i] + 4, y, h, { bold: true }));
    for (const lab of doc.labs) {
      y -= 22;
      const flagged = lab.flag !== null;
      text(cols[0] + 4, y, lab.test);
      text(cols[1] + 4, y, lab.value, { bold: flagged, rgb: flagged ? [0.75, 0.1, 0.1] : [0.1, 0.1, 0.1] });
      text(cols[2] + 4, y, lab.unit);
      text(cols[3] + 4, y, lab.range);
      if (flagged) text(cols[4] + 4, y, lab.flag, { bold: true, rgb: [0.75, 0.1, 0.1] });
      rule(y - 8, [0.9, 0.9, 0.9], 0.4);
    }
    y -= 30;
    text(M, y, "H = above reference range, L = below reference range, as determined by the reporting laboratory.", { size: 8, rgb: [0.4, 0.4, 0.4] });
  }

  const meds = SAMPLE_MEDICATION_SPECS.filter((m) => m.doc.id === doc.id);
  if (doc.notes?.length) {
    y -= 26;
    for (const note of doc.notes) {
      for (const line of wrap(note, 92)) {
        text(M, y, line);
        y -= 15;
      }
      y -= 3;
    }
  }
  if (meds.length) {
    y -= 12;
    text(M, y, "Rx", { size: 22, bold: true, rgb: color });
    y -= 26;
    meds.forEach((m, i) => {
      text(M + 10, y, `${i + 1}.  ${m.name}`, { bold: true, size: 11 });
      y -= 15;
      const detail = [m.dosage, m.frequency, m.duration && (/^\d/.test(m.duration) ? `for ${m.duration}` : m.duration), m.instructions].filter(Boolean).join("  -  ");
      text(M + 28, y, detail, { rgb: [0.25, 0.25, 0.25] });
      y -= 22;
    });
  }

  // Signature and footer
  text(W - M - 170, 150, doc.provider, { bold: true });
  rule(165, [0.6, 0.6, 0.6]);
  text(W - M - 170, 136, doc.type === "lab_report" ? "Authorised signatory" : "Signature", { size: 8, rgb: [0.4, 0.4, 0.4] });
  fill([0.98, 0.94, 0.85]);
  ops.push(`${M} 50 ${W - 2 * M} 34 re f`);
  text(M + 10, 70, "SYNTHETIC SAMPLE - not a real patient, doctor or laboratory.", { size: 9, bold: true, rgb: [0.55, 0.35, 0.05] });
  text(M + 10, 57, "Generated for the MyHealthVault \"Try sample\" demo. Not for clinical use.", { size: 8, rgb: [0.55, 0.35, 0.05] });

  return ops.join("\n");
}

function buildPdf(content, title) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
    `<< /Title (${pdfText(title)}) /Producer (MyHealthVault sample generator) >>`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const doc of SAMPLE_DOCUMENTS) {
  fs.writeFileSync(path.join(OUT, `${doc.id}.pdf`), buildPdf(renderPage(doc), doc.filename));
}
console.log(`Wrote ${SAMPLE_DOCUMENTS.length} PDFs to ${path.relative(process.cwd(), OUT)}`);
