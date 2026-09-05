import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  APPEARANCE_STORAGE_KEY,
  setAppearance,
  useAppearance,
} from "#/themes/appearance";

describe("local appearance", () => {
  let dark: boolean;
  let onSystemChange: (() => void) | undefined;
  beforeEach(() => {
    localStorage.clear();
    dark = false;
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: dark,
        addEventListener: (_: string, callback: () => void) => {
          onSystemChange = callback;
        },
        removeEventListener: vi.fn(),
      })),
    );
    window.dispatchEvent(
      new StorageEvent("storage", { key: APPEARANCE_STORAGE_KEY }),
    );
  });

  it("defaults to the system and updates when the system changes", () => {
    const { result } = renderHook(useAppearance);
    expect(result.current).toEqual({ preference: "system", resolved: "light" });
    act(() => {
      dark = true;
      onSystemChange?.();
    });
    expect(result.current.resolved).toBe("dark");
  });

  it("persists explicit choices locally and ignores system changes until system is selected", () => {
    const { result } = renderHook(useAppearance);
    act(() => setAppearance("light"));
    expect(localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe("light");
    act(() => {
      dark = true;
      onSystemChange?.();
    });
    expect(result.current.resolved).toBe("light");
    act(() => setAppearance("system"));
    expect(result.current.resolved).toBe("dark");
  });

  it("synchronizes preferences from another tab", () => {
    const { result } = renderHook(useAppearance);
    act(() => {
      localStorage.setItem(APPEARANCE_STORAGE_KEY, "dark");
      window.dispatchEvent(
        new StorageEvent("storage", { key: APPEARANCE_STORAGE_KEY }),
      );
    });
    expect(result.current).toEqual({ preference: "dark", resolved: "dark" });
  });
});
