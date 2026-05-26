import { DEFAULT_SETTINGS, type Draft } from "@/lib/types";

const KEY = "artistbio:draft";

export function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    return {
      answers: parsed.answers ?? {},
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveDraft(draft: Omit<Draft, "updatedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const payload: Draft = { ...draft, updatedAt: new Date().toISOString() };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // localStorage kan vol of geblokkeerd zijn; stil falen is hier acceptabel.
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // negeren
  }
}
