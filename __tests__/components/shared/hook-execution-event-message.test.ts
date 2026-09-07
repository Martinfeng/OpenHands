import { describe, expect, it } from "vitest";
import { hookStatusBadgeClassName } from "#/components/shared/hook-execution-event-message";

describe("hookStatusBadgeClassName", () => {
  it("uses a tinted success token instead of a dark-mode green slab", () => {
    const className = hookStatusBadgeClassName(false, true);
    expect(className).toContain("--oh-success");
    expect(className).not.toContain("green-900");
    expect(className).not.toContain("green-300");
  });

  it("tints blocked and failed badges from semantic status colors", () => {
    expect(hookStatusBadgeClassName(true, false)).toContain("--oh-warning");
    expect(hookStatusBadgeClassName(false, false)).toContain("--oh-status-error");
  });
});
