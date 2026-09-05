import {
  oneLight,
  vscDarkPlus,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useUITheme } from "./ui-theme-context";

export function useCodeTheme() {
  return useUITheme() === "light" ? oneLight : vscDarkPlus;
}
