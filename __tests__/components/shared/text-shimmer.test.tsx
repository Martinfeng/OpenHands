import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TextShimmer } from "#/components/shared/text-shimmer";

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
  it("renders a single neutral shimmer on the title", () => {
    render(
      <TextShimmer data-testid="shimmer" duration={3} spread={2}>
        Sending...
      </TextShimmer>,
    );

    const shimmer = screen.getByTestId("shimmer");
    expect(shimmer.style.backgroundImage).toContain("linear-gradient");
    expect(shimmer.style.backgroundImage).not.toContain("repeating");
    expect(shimmer.style.backgroundImage).toContain("var(--oh-foreground)");
    expect(shimmer.style.backgroundImage).toContain("var(--oh-muted)");
    expect(shimmer.style.backgroundSize).toBe("200% 100%");
    // Text remains painted when the moving highlight is outside its bounds.
    expect(shimmer.style.backgroundColor).toBe(
      "var(--oh-shimmer-base, var(--oh-muted))",
    );
    expect(shimmer.style.animation).toContain("oh-text-shimmer-");
  });
  it("keeps the title readable and static for reduced motion", () => {
    motionPreference.reduce = true;
    render(<TextShimmer data-testid="static">Responding</TextShimmer>);
    expect(screen.getByTestId("static")).toHaveTextContent("Responding");
    expect(screen.getByTestId("static").style.animation).toBe("");
    motionPreference.reduce = false;
  });
});
