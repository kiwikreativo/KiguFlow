const DAY = 86_400_000;
const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function relativeTime(date: string | Date, now = new Date()) {
  const ms = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** 14 counts, oldest first, ending today; days with no completions are 0. */
export function fillDays(rows: Array<{ day: string; count: number }>, today = new Date()) {
  const byDay = new Map(rows.map((r) => [r.day, r.count]));
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today.getTime() - (13 - i) * DAY);
    return { day: isoDay(d), count: byDay.get(isoDay(d)) ?? 0, date: d };
  });
}

/** This 7 days vs the previous 7, as a rounded %; null when there's nothing to compare against. */
export function weekDelta(counts: number[]) {
  const last = counts.slice(-14, -7).reduce((a, b) => a + b, 0);
  const current = counts.slice(-7).reduce((a, b) => a + b, 0);
  return last ? Math.round(((current - last) / last) * 100) : null;
}

/** Smooth line through the points (quadratic curves via midpoints), scaled into w×h with 4px padding. */
export function sparkPath(values: number[], w: number, h: number) {
  if (!values.length) return { line: "", area: "", end: { x: 0, y: h } };
  const max = Math.max(...values, 1);
  const pad = 4;
  const pts = values.map((v, i) => ({
    x: values.length === 1 ? w / 2 : (i / (values.length - 1)) * w,
    y: pad + (1 - v / max) * (h - pad * 2),
  }));
  let line = `M${pts[0]!.x},${pts[0]!.y}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1]!, q = pts[i]!;
    const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
    line += ` Q${p.x},${p.y} ${mx},${my}`;
  }
  const end = pts[pts.length - 1]!;
  line += ` T${end.x},${end.y}`;
  return { line, area: `${line} L${end.x},${h} L${pts[0]!.x},${h} Z`, end };
}

export type Hub = { hasOpenIssue: boolean; inReview: boolean; waiting: boolean };
export function hubBadge(hub: Hub) {
  if (hub.hasOpenIssue) return { label: "Issue open", tone: "danger" as const };
  if (hub.inReview) return { label: "Reviewing", tone: "good" as const };
  if (hub.waiting) return { label: "Pending files", tone: "neutral" as const };
  return { label: "Active", tone: "neutral" as const };
}
