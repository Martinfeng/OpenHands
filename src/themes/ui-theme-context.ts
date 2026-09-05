import { createContext, useContext } from "react";
import type { ResolvedAppearance } from "./appearance-palette";

// Embedded components follow their nearest host root, never app localStorage.
export const UIThemeContext = createContext<ResolvedAppearance>("dark");
export const useUITheme = () => useContext(UIThemeContext);
