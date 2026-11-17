import { describe, expect, it } from "vitest";
import { pageList } from "./pagination";

describe("pageList", () => {
  it("handles single, small and gapped ranges", () => {
    expect(pageList(1, 1)).toEqual([1]);
    expect(pageList(2, 3)).toEqual([1, 2, 3]);
    expect(pageList(1, 10)).toEqual([1, 2, "…", 10]);
    expect(pageList(5, 10)).toEqual([1, "…", 4, 5, 6, "…", 10]);
    expect(pageList(10, 10)).toEqual([1, "…", 9, 10]);
  });
});
