import { describe, expect, it } from "vitest";
import { appearanceVariables } from "#/themes/appearance-palette";

function lightness(channels: string): number {
  const match = channels.match(/([\d.]+)%\s*$/);
  return match ? Number(match[1]) : Number.NaN;
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
});
