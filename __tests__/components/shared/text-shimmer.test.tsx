import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  SHIMMER_CYCLE_SECONDS,
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
    expect(shimmer.style.backgroundImage).toMatch(/50% - 5\.2ch/);
    expect(shimmer.style.backgroundImage).not.toMatch(/50% - \d+(\.\d+)?%/);
    expect(shimmer.style.backgroundSize).toBe("360% 100%");
    expect(shimmer.style.backgroundColor).toBe(
      "var(--oh-shimmer-base, var(--oh-muted))",
    );
    expect(shimmer.style.animation).toContain("oh-text-shimmer-");
    expect(parseFloat(shimmer.style.animation.split(" ")[1])).toBeLessThan(2);
    const keyframes = shimmer.previousElementSibling?.textContent ?? "";
    expect(keyframes).toMatch(/0%\{background-position:100% center\}/);
    expect(keyframes).toMatch(/100%\{background-position:0% center\}/);
    expect(keyframes).not.toMatch(/78%,100%/);
  });

  it("keeps one two-second loop so short titles move slower than long ones", () => {
    render(
      <>
        <TextShimmer data-testid="short">Hi</TextShimmer>
        <TextShimmer data-testid="long">
          Running a much longer command title
        </TextShimmer>
      </>,
    );
    expect(SHIMMER_CYCLE_SECONDS).toBe(2);
    expect(screen.getByTestId("short").style.animation).toContain(" 2s ");
    expect(screen.getByTestId("long").style.animation).toContain(" 2s ");
  });
  it("keeps the title readable and static for reduced motion", () => {
    motionPreference.reduce = true;
    render(<TextShimmer data-testid="static">Responding</TextShimmer>);
    expect(screen.getByTestId("static")).toHaveTextContent("Responding");
    expect(screen.getByTestId("static").style.animation).toBe("");
    motionPreference.reduce = false;
  });
});
