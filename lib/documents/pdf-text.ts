import { DocumentError } from "./errors";

export const MAX_PAGES = 20;
/** Pages with less embedded text than this are treated as scanned images. */
export const MIN_TEXT_CHARS_PER_PAGE = 20;
export const MAX_TEXT_CHARS_PER_PAGE = 20_000;

export interface PageText {
  pageNumber: number;
  text: string;
}

export interface PdfTextResult {
  pageCount: number;
  /** Pages whose embedded text layer is usable. */
  textPages: PageText[];
  /** Pages that need OCR (no usable text layer). */
  pagesNeedingOcr: number[];
}

interface TextItemLike {
  str?: string;
  hasEOL?: boolean;
}

function joinItems(items: TextItemLike[]): string {
  let out = "";
  for (const item of items) {
    if (typeof item.str !== "string") continue;
    out += item.str;
    out += item.hasEOL ? "\n" : " ";
  }
  return out
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_CHARS_PER_PAGE);
}

/**
 * Reads the embedded text layer page by page. Never truncates silently: a
 * document over MAX_PAGES is rejected, and pages without text are reported
 * so the caller can OCR them.
 */
export async function extractPdfText(bytes: Uint8Array, maxPages = MAX_PAGES): Promise<PdfTextResult> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({
      // pdf.js may transfer/detach the buffer; give it its own copy.
      data: new Uint8Array(bytes),
      useSystemFonts: false,
      disableFontFace: true,
      stopAtErrors: false,
      // Text extraction does not need font glyph data; silence those warnings.
      verbosity: 0,
    });
  let pdf;
  try {
    pdf = await task.promise;
  } catch (error) {
    await task.destroy();
    if ((error as { name?: string })?.name === "PasswordException") throw new DocumentError("pdf_encrypted");
    throw new DocumentError("pdf_invalid");
  }

  try {
    if (pdf.numPages > maxPages) throw new DocumentError("too_many_pages");
    const textPages: PageText[] = [];
    const pagesNeedingOcr: number[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = joinItems(content.items as TextItemLike[]);
      page.cleanup();
      if (text.replace(/\s/g, "").length >= MIN_TEXT_CHARS_PER_PAGE) {
        textPages.push({ pageNumber, text });
      } else {
        pagesNeedingOcr.push(pageNumber);
      }
    }
    return { pageCount: pdf.numPages, textPages, pagesNeedingOcr };
  } finally {
    await task.destroy();
  }
}
