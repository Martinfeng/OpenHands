import { heroui } from "@heroui/react";
import { heroAppearanceColors } from "./src/themes/appearance-palette";

export default heroui({
  defaultTheme: "dark",
  layout: { radius: { small: "8px", medium: "12px", large: "16px" } },
  themes: {
    light: { colors: heroAppearanceColors("light") },
    dark: { colors: heroAppearanceColors("dark") },
  },
});
