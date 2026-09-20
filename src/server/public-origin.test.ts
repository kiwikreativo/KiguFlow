import { describe, expect, it } from "vitest";
import { resolvePublicOrigin } from "./public-origin";

describe("public application origin", () => {
  const allowed = "http://localhost:4321, http://localhost:8787, https://kiguflow.example";

  it("uses the active allowed browser origin", () => {
    expect(resolvePublicOrigin("http://localhost:8787", allowed, "http://localhost:4321"))
      .toBe("http://localhost:8787");
    expect(resolvePublicOrigin("https://kiguflow.example", allowed, "http://localhost:4321"))
      .toBe("https://kiguflow.example");
  });

  it("uses the request URL when the browser omits the Origin header", () => {
    expect(resolvePublicOrigin(undefined, allowed, "http://localhost:4321", "http://localhost:8787/api/admin/projects/123/portal-token"))
      .toBe("http://localhost:8787");
  });

  it("falls back for missing, invalid, or unapproved origins", () => {
    expect(resolvePublicOrigin(undefined, allowed, "http://localhost:4321/app"))
      .toBe("http://localhost:4321");
    expect(resolvePublicOrigin("https://attacker.example", allowed, "http://localhost:4321"))
      .toBe("http://localhost:4321");
    expect(resolvePublicOrigin("not-a-url", allowed, "http://localhost:4321"))
      .toBe("http://localhost:4321");
  });
});
