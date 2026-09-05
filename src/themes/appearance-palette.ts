export type ResolvedAppearance = "light" | "dark";

// Existing semantic scale: text at 50, surfaces at 950. Invert luminance
// for light appearance so existing components inherit the same tokens.
export const APPEARANCE_PALETTES = {
  light: {
    50: "#17191d",
    100: "#262930",
    200: "#41464f",
    300: "#555b65",
    400: "#686f7b",
    500: "#787f89",
    600: "#bcc1c9",
    700: "#d4d7dd",
    800: "#e5e7eb",
    900: "#eef0f3",
    925: "#f5f6f8",
    950: "#ffffff",
    975: "#f0f2f5",
  },
  dark: {
    50: "#f5f6f8",
    100: "#e6e8ec",
    200: "#c7cbd2",
    300: "#b0b5bf",
    400: "#959ca8",
    500: "#828a98",
    600: "#555b66",
    700: "#414650",
    800: "#343942",
    900: "#2b3038",
    925: "#23272e",
    950: "#1b1e24",
    975: "#171a1f",
  },
} as const;

export function appearanceVariables(appearance: ResolvedAppearance) {
  return {
    ...Object.fromEntries(
      Object.entries(APPEARANCE_PALETTES[appearance]).map(([step, value]) => [
        `--cool-grey-${step}`,
        value,
      ]),
    ),
    "--oh-color-primary": "#3478f6",
    "--oh-accent": "#3478f6",
    "--oh-accent-foreground": "#ffffff",
    "--oh-link": appearance === "light" ? "#2463d4" : "#8cb6ff",
    "--oh-focus": "#3478f6",
    "--oh-color-success": appearance === "light" ? "#21824b" : "#78c99c",
    "--oh-success": appearance === "light" ? "#21824b" : "#78c99c",
    "--oh-warning": appearance === "light" ? "#946200" : "#dfba72",
    "--oh-status-success": appearance === "light" ? "#21824b" : "#78c99c",
    "--oh-status-error": appearance === "light" ? "#c83737" : "#f38b88",
    "--oh-modal-title-foreground": "var(--oh-foreground)",
    "--oh-separator": "var(--oh-border-subtle)",
    "--oh-radius": "12px",
    "--oh-field-radius": "10px",
    "--oh-overlay-shadow":
      "0 16px 48px rgb(0 0 0 / 14%), 0 2px 6px rgb(0 0 0 / 6%)",
    "--oh-surface-shadow": "0 1px 3px rgb(0 0 0 / 4%)",
  };
}

export function heroAppearanceColors(appearance: ResolvedAppearance) {
  const p = APPEARANCE_PALETTES[appearance];
  return {
    primary: { DEFAULT: "#3478f6", foreground: "#ffffff" },
    focus: "#3478f6",
    background: { DEFAULT: p[950], foreground: p[100] },
    foreground: { DEFAULT: p[100] },
    content1: { DEFAULT: p[925], foreground: p[100] },
    content2: { DEFAULT: p[900], foreground: p[100] },
    content3: { DEFAULT: p[800], foreground: p[100] },
    content4: { DEFAULT: p[700], foreground: p[100] },
    default: {
      50: p[975],
      100: p[950],
      200: p[925],
      300: p[900],
      400: p[800],
      500: p[700],
      600: p[600],
      700: p[500],
      800: p[400],
      900: p[300],
      DEFAULT: p[800],
      foreground: p[100],
    },
  };
}
