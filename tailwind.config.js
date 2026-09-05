/** @type {import('tailwindcss').Config} */
import typography from "@tailwindcss/typography";
export default {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        modal: {
          background: "var(--oh-overlay)",
          input: "var(--oh-surface-raised)",
          primary: "var(--oh-accent)",
          secondary: "var(--oh-text-secondary)",
          muted: "var(--oh-muted)",
        },
        surface: {
          DEFAULT: "var(--oh-surface)",
          card: "var(--oh-surface)",
          elevated: "var(--oh-surface-raised)",
          outline: "var(--oh-border)",
          background: "var(--oh-background)",
          divider: "var(--oh-border-subtle)",
          button: "var(--oh-interactive-hover)",
          text: "var(--oh-muted)",
        },
        border: {
          DEFAULT: "var(--oh-border)",
          hover: "var(--oh-border-input)",
        },
        content: {
          DEFAULT: "var(--oh-foreground)",
          muted: "var(--oh-muted)",
          icon: "var(--oh-text-secondary)",
        },
        status: {
          "success-bg": "rgba(16, 185, 129, 0.1)",
          "success-border": "rgba(16, 185, 129, 0.4)",
          "success-text": "var(--oh-status-success)",
          "success-badge-bg": "rgba(16, 185, 129, 0.15)",
          "fail-bg": "rgba(244, 63, 94, 0.1)",
          "fail-border": "rgba(244, 63, 94, 0.4)",
          "fail-text": "var(--oh-status-error)",
          "fail-solid": "#dc2626",
          "fail-solid-hover": "#b91c1c",
        },
        toggle: {
          active: "#34d399",
          "active-bg": "rgba(52, 211, 153, 0.2)",
          "active-border": "rgba(52, 211, 153, 0.5)",
          inactive: "var(--oh-interactive-active)",
          "inactive-knob": "var(--oh-muted)",
          "inactive-border": "var(--oh-border)",
        },
        "muted-overlay": "rgba(5, 5, 5, 0.4)",
        "pill-bg": "rgba(31, 31, 31, 0.3)",
      },
    },
  },
  plugins: [typography],
};
