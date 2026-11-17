import { describe, expect, it } from "vitest";
import { fillDays, hubBadge, relativeTime, sparkPath, weekDelta } from "./dashboardView";

describe("dashboardView", () => {
  it("formats relative times", () => {
    const now = new Date("2026-06-12T12:00:00Z");
    expect(relativeTime("2026-06-12T11:59:30Z", now)).toBe("just now");
    expect(relativeTime("2026-06-12T11:42:00Z", now)).toBe("18 min ago");
    expect(relativeTime("2026-06-12T10:00:00Z", now)).toBe("2h ago");
    expect(relativeTime("2026-06-11T10:00:00Z", now)).toBe("Yesterday");
    expect(relativeTime("2026-06-09T12:00:00Z", now)).toBe("3d ago");
  });

  it("fills 14 days ending today with zeros for gaps", () => {
    const days = fillDays([{ day: "2026-06-12", count: 4 }, { day: "2026-06-01", count: 2 }], new Date(2026, 5, 12, 9));
    expect(days).toHaveLength(14);
    expect(days[0]!.day).toBe("2026-05-30");
    expect(days[13]).toMatchObject({ day: "2026-06-12", count: 4 });
    expect(days.find((d) => d.day === "2026-06-01")!.count).toBe(2);
    expect(days.reduce((a, d) => a + d.count, 0)).toBe(6);
  });

  it("compares this week to last week", () => {
    expect(weekDelta([...Array(7).fill(1), ...Array(7).fill(2)])).toBe(100);
    expect(weekDelta([...Array(7).fill(2), ...Array(7).fill(1)])).toBe(-50);
    expect(weekDelta(Array(14).fill(0))).toBeNull();
  });

  it("builds a spark path that ends on the last point", () => {
    const { line, area, end } = sparkPath([0, 5, 10], 100, 50);
    expect(line.startsWith("M0,46")).toBe(true);
    expect(end).toEqual({ x: 100, y: 4 });
    expect(area.endsWith("Z")).toBe(true);
    expect(sparkPath([], 100, 50).line).toBe("");
  });

  it("picks the most urgent hub badge", () => {
    expect(hubBadge({ hasOpenIssue: true, inReview: true, waiting: true }).label).toBe("Issue open");
    expect(hubBadge({ hasOpenIssue: false, inReview: true, waiting: true }).label).toBe("Reviewing");
    expect(hubBadge({ hasOpenIssue: false, inReview: false, waiting: true }).label).toBe("Pending files");
    expect(hubBadge({ hasOpenIssue: false, inReview: false, waiting: false }).label).toBe("Active");
  });
});
