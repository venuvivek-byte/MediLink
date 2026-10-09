/** Newest first; records without a date sort last. */
export function byDateDesc<T>(getDate: (item: T) => string | null) {
  return (a: T, b: T): number => {
    const da = getDate(a);
    const db = getDate(b);
    if (da === db) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return da < db ? 1 : -1;
  };
}
