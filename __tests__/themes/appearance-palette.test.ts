import { describe, expect, it } from "vitest";
import { appearanceVariables } from "#/themes/appearance-palette";

function lightness(channels: string): number {
  const match = channels.match(/([\d.]+)%\s*$/);
  return match ? Number(match[1]) : Number.NaN;
}

function hexLuminance(hex: string): number {
  const raw = hex.replace("#", "");
  const channel = (offset: number) => {
    const value = Number.parseInt(raw.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

describe("appearanceVariables", () => {
  it("puts HeroUI overlay tokens on the appearance root so portalled menus follow light mode", () => {
    const light = appearanceVariables("light");
    const dark = appearanceVariables("dark");

    expect(lightness(light["--heroui-content1"])).toBeGreaterThan(90);
    expect(lightness(light["--heroui-content1-foreground"])).toBeLessThan(25);
    expect(lightness(dark["--heroui-content1"])).toBeLessThan(25);
    expect(lightness(dark["--heroui-content1-foreground"])).toBeGreaterThan(70);
    expect(light["--heroui-content1"]).not.toBe(dark["--heroui-content1"]);
  });

  it("uses a white glint so the light-mode shimmer reads on muted glyphs", () => {
    const light = appearanceVariables("light");
    const dark = appearanceVariables("dark");
    const highlight = hexLuminance(light["--oh-shimmer-highlight"]);
    const base = hexLuminance(light["--oh-shimmer-base"]);

    expect(light["--oh-shimmer-highlight"]).toBe("#ffffff");
    expect(highlight).toBeGreaterThan(0.9);
    expect(highlight - base).toBeGreaterThan(0.7);
    expect(dark["--oh-shimmer-highlight"]).toBe("#ffffff");
  });
});
