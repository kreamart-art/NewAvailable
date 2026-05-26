"use client";

import {
  LANGUAGE_OPTIONS,
  LENGTH_OPTIONS,
  PERSPECTIVE_OPTIONS,
  TONE_OPTIONS,
} from "@/lib/questionnaire";
import type { OutputSettings } from "@/lib/types";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  settings: OutputSettings;
  onChange: (next: OutputSettings) => void;
  /** Compacte rij-indeling (voor /result). Standaard rasterindeling. */
  layout?: "grid" | "row";
  disabled?: boolean;
}

export function OutputSettingsControls({
  settings,
  onChange,
  layout = "grid",
  disabled = false,
}: Props) {
  const wrapper =
    layout === "row"
      ? "flex flex-wrap gap-3"
      : "grid gap-5 sm:grid-cols-2";
  const itemClass = layout === "row" ? "min-w-[150px] flex-1 space-y-1.5" : "space-y-2";

  return (
    <div className={wrapper}>
      <div className={itemClass}>
        <Label>Taal</Label>
        <Select
          value={settings.language}
          disabled={disabled}
          onValueChange={(v) =>
            onChange({ ...settings, language: v as OutputSettings["language"] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={itemClass}>
        <Label>Lengte</Label>
        <Select
          value={settings.length}
          disabled={disabled}
          onValueChange={(v) =>
            onChange({ ...settings, length: v as OutputSettings["length"] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LENGTH_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={itemClass}>
        <Label>Toon</Label>
        <Select
          value={settings.tone}
          disabled={disabled}
          onValueChange={(v) =>
            onChange({ ...settings, tone: v as OutputSettings["tone"] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TONE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={itemClass}>
        <Label>Perspectief</Label>
        <Select
          value={settings.perspective}
          disabled={disabled}
          onValueChange={(v) =>
            onChange({
              ...settings,
              perspective: v as OutputSettings["perspective"],
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERSPECTIVE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
