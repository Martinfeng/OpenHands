import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import toast, { Toaster } from "react-hot-toast";
import { TOAST_OPTIONS } from "#/utils/custom-toast-handlers";

describe("toast appearance", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    toast.remove();
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders loading toast text with semantic foreground color", async () => {
    render(<Toaster toastOptions={TOAST_OPTIONS} />);

    act(() => {
      toast.loading("正在创建会话…", TOAST_OPTIONS);
    });

    const node = await screen.findByText("正在创建会话…");
    const styled = node.closest("[style]");
    expect(styled).toHaveStyle({ color: "var(--oh-foreground)" });
  });
});
