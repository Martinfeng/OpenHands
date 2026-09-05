import { useSyncExternalStore } from "react";
import type { ResolvedAppearance } from "./appearance-palette";

export type AppearancePreference = "system" | ResolvedAppearance;
export const APPEARANCE_STORAGE_KEY = "openhands-appearance";
const CHANGE_EVENT = "openhands-appearance-change";
const SYSTEM_QUERY = "(prefers-color-scheme: dark)";
let currentPreference: AppearancePreference | undefined;

export function readAppearance(): AppearancePreference {
  try {
    const value = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    /* Storage can be disabled by the host. */
  }
  return "system";
}

export function setAppearance(preference: AppearancePreference) {
  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, preference);
  } catch {
    /* The current tab can still apply its choice. */
  }
  currentPreference = preference;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia?.(SYSTEM_QUERY);
  const onStorage = (event: StorageEvent) => {
    if (event.key === APPEARANCE_STORAGE_KEY || event.key === null) {
      currentPreference = undefined;
      onChange();
    }
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  media?.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
    media?.removeEventListener("change", onChange);
  };
}

function getPreference() {
  return currentPreference ?? readAppearance();
}
function getResolved(): ResolvedAppearance {
  const preference = getPreference();
  return preference === "system"
    ? window.matchMedia?.(SYSTEM_QUERY).matches
      ? "dark"
      : "light"
    : preference;
}

export function useAppearance() {
  const preference = useSyncExternalStore(
    subscribe,
    getPreference,
    () => "system" as const,
  );
  const resolved = useSyncExternalStore(
    subscribe,
    getResolved,
    () => "light" as const,
  );
  return { preference, resolved };
}
