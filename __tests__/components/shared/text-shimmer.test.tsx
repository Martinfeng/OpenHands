import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  shimmerCycleSeconds,
  TextShimmer,
} from "#/components/shared/text-shimmer";

const { motionPreference } = vi.hoisted(() => ({
  motionPreference: { reduce: false },
}));
vi.mock("framer-motion", async () => {
  const actual =
    await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    useReducedMotion: () => motionPreference.reduce,
  };
});

describe("TextShimmer", () => {
  it("keeps a narrow highlight so short titles still show contrast", () => {
    render(
      <TextShimmer data-testid="shimmer" duration={1.4}>
        Edit
      </TextShimmer>,
    );

    const shimmer = screen.getByTestId("shimmer");
    expect(shimmer.style.backgroundImage).toContain("linear-gradient");
    expect(shimmer.style.backgroundImage).not.toContain("repeating");
    expect(shimmer.style.backgroundImage).toMatch(/50% - 0\.58em/);
    expect(shimmer.style.backgroundImage).not.toMatch(/50% - \d+(\.\d+)?%/);
    expect(shimmer.style.backgroundSize).toBe("200% 100%");
    expect(shimmer.style.backgroundColor).toBe(
      "var(--oh-shimmer-base, var(--oh-muted))",
    );
    expect(shimmer.style.animation).toContain("oh-text-shimmer-");
    expect(parseFloat(shimmer.style.animation.split(" ")[1])).toBeLessThan(2);
  });

  it("scales the cycle with title width so short labels are not a 3s wash", () => {
    expect(shimmerCycleSeconds(36)).toBeLessThan(1.6);
    expect(shimmerCycleSeconds(36)).toBeGreaterThan(1);
    expect(shimmerCycleSeconds(36)).toBeLessThan(shimmerCycleSeconds(220));
    expect(shimmerCycleSeconds(220)).toBeLessThan(2.4);
  });
  it("keeps the title readable and static for reduced motion", () => {
    motionPreference.reduce = true;
    render(<TextShimmer data-testid="static">Responding</TextShimmer>);
    expect(screen.getByTestId("static")).toHaveTextContent("Responding");
    expect(screen.getByTestId("static").style.animation).toBe("");
    motionPreference.reduce = false;
  });
});
