// Medicine names that are known to be confused with each other, in
// handwriting and in reading. Sources: the ISMP list of confused drug names
// and commonly reported generic pairs. Deliberately conservative: a warning
// here means "check this name letter by letter against the original", never
// "this is wrong". The list is NOT exhaustive; no warning does not mean the
// name was read correctly.

const GROUPS: string[][] = [
  ["hydroxyzine", "hydralazine"],
  ["clonidine", "clonazepam"],
  ["lamotrigine", "lamivudine"],
  ["levetiracetam", "levofloxacin"],
  ["metformin", "metronidazole"],
  ["prednisone", "prednisolone"],
  ["hydrocodone", "oxycodone"],
  ["glipizide", "glyburide"],
  ["tramadol", "trazodone"],
  ["carbamazepine", "oxcarbazepine"],
  ["risperidone", "ropinirole"],
  ["amlodipine", "amiloride"],
  ["azithromycin", "erythromycin"],
  ["chlorpromazine", "chlorpropamide"],
  ["clomiphene", "clomipramine"],
  ["methotrexate", "metolazone"],
  ["sitagliptin", "sumatriptan"],
  ["tizanidine", "tiagabine"],
  ["celebrex", "celexa", "cerebyx"],
  ["lamictal", "lamisil"],
  ["zantac", "xanax", "zyrtec"],
];

const PARTNERS = new Map<string, string[]>();
for (const group of GROUPS) {
  for (const name of group) PARTNERS.set(name, group.filter((other) => other !== name));
}

/** Classic edit distance, capped: returns `max + 1` as soon as it is exceeded. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Names this medicine is easily confused with, or [] when none are known.
 * Matches each word of the name exactly, or with one wrong letter for words
 * of 7+ letters (a misread like "metformn" still warns).
 */
export function lookAlikeNames(medicineName: string): string[] {
  const words = medicineName.toLowerCase().match(/[a-z]+/g) ?? [];
  const found = new Set<string>();
  for (const word of words) {
    if (word.length < 4) continue;
    for (const [name, partners] of PARTNERS) {
      const close = word === name || (word.length >= 7 && editDistance(word, name, 1) <= 1);
      if (close) partners.forEach((p) => found.add(p));
    }
  }
  // Never warn that a name looks like itself (e.g. "celexa" typed with both in the line).
  words.forEach((w) => found.delete(w));
  return [...found];
}
