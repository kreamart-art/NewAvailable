export type Language = "nl" | "en" | "de" | "fr";
export type Length = "kort" | "middel" | "lang";
export type Tone = "formeel" | "kritisch" | "warm" | "speels";
export type Perspective = "eerste" | "derde";

export interface OutputSettings {
  language: Language;
  length: Length;
  tone: Tone;
  perspective: Perspective;
}

/** Vrije tekstantwoorden, gekoppeld aan veld-id. */
export type Answers = Record<string, string>;

export interface Draft {
  answers: Answers;
  settings: OutputSettings;
  /** ISO-tijdstip van laatste wijziging. */
  updatedAt: string;
}

export interface GenerateRequest {
  answers: Answers;
  settings: OutputSettings;
}

export const DEFAULT_SETTINGS: OutputSettings = {
  language: "nl",
  length: "middel",
  tone: "warm",
  perspective: "derde",
};
