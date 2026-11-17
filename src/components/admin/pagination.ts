/** Page buttons: first, current±1, last, with "…" for gaps. */
export function pageList(current: number, last: number): (number | "…")[] {
  const pages = [...new Set([1, current - 1, current, current + 1, last])]
    .filter((p) => p >= 1 && p <= last)
    .sort((a, b) => a - b);
  return pages.flatMap((p, i) => (i && p - pages[i - 1] > 1 ? ["…" as const, p] : [p]));
}
