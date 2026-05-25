import type { Language, Length, Perspective, Tone } from "@/lib/types";

export type FieldType = "text" | "textarea";

export interface Field {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
  required?: boolean;
}

export interface Section {
  id: string;
  /** Letterprefix uit de opdracht, bv. "A". */
  key: string;
  title: string;
  description: string;
  fields: Field[];
}

/**
 * Secties A t/m E bevatten de vrije antwoorden. Sectie F (output-instellingen)
 * wordt apart afgehandeld via de OutputSettings-selecties.
 */
export const SECTIONS: Section[] = [
  {
    id: "basis",
    key: "A",
    title: "Basis",
    description: "Wie ben je en in welke discipline werk je?",
    fields: [
      {
        id: "naam",
        label: "Naam of artiestennaam",
        type: "text",
        placeholder: "bv. Amira Bloom",
        required: true,
      },
      {
        id: "discipline",
        label: "Discipline",
        type: "text",
        placeholder: "beeldend kunstenaar, muzikant, of beide",
        hint: "Bepaalt de toon en terminologie van de biografie.",
        required: true,
      },
      {
        id: "locatie",
        label: "Standplaats",
        type: "text",
        placeholder: "bv. Rotterdam, Nederland",
      },
      {
        id: "geboorte",
        label: "Geboortejaar / -plaats",
        type: "text",
        placeholder: "bv. 1991, Antwerpen",
      },
      {
        id: "aanspreekvorm",
        label: "Aanspreekvorm",
        type: "text",
        placeholder: "bv. zij/haar, hij/hem, hen/hun",
      },
    ],
  },
  {
    id: "werk",
    key: "B",
    title: "Werk",
    description: "Wat maak je en hoe ziet het eruit?",
    fields: [
      {
        id: "medium",
        label: "Medium, technieken of instrumenten",
        type: "textarea",
        placeholder:
          "bv. olieverf en collage / elektronische productie, analoge synths, zang",
        required: true,
      },
      {
        id: "stijl",
        label: "Stijl en esthetiek",
        type: "textarea",
        placeholder: "Hoe zou je je signatuur of klank omschrijven?",
      },
      {
        id: "themas",
        label: "Thema's en onderwerpen",
        type: "textarea",
        placeholder: "Welke ideeën, vragen of motieven keren terug in je werk?",
      },
      {
        id: "kernwerk",
        label: "Kenmerkend werk of project",
        type: "textarea",
        placeholder:
          "Beschrijf één werk, album of serie die je praktijk goed vat.",
      },
    ],
  },
  {
    id: "achtergrond",
    key: "C",
    title: "Achtergrond",
    description: "Waar komt je praktijk vandaan?",
    fields: [
      {
        id: "opleiding",
        label: "Opleiding",
        type: "textarea",
        placeholder: "Academies, conservatoria, diploma's, jaartallen.",
      },
      {
        id: "invloeden",
        label: "Invloeden en mentoren",
        type: "textarea",
        placeholder: "Kunstenaars, docenten, scenes of tradities die je vormden.",
      },
      {
        id: "oorsprong",
        label: "Hoe het begon",
        type: "textarea",
        placeholder: "Het keerpunt of de aanleiding om hieraan te beginnen.",
      },
    ],
  },
  {
    id: "carriere",
    key: "D",
    title: "Carrière",
    description: "Wat heb je tot nu toe gedaan en bereikt?",
    fields: [
      {
        id: "exposities",
        label: "Exposities of optredens",
        type: "textarea",
        placeholder:
          "Belangrijkste shows, festivals of concerten — met locatie en jaartal.",
      },
      {
        id: "prijzen",
        label: "Prijzen, beurzen en residenties",
        type: "textarea",
        placeholder: "Onderscheidingen, subsidies, residentieprogramma's.",
      },
      {
        id: "pers",
        label: "Publicaties en pers",
        type: "textarea",
        placeholder: "Recensies, interviews, catalogi, releases.",
      },
      {
        id: "netwerk",
        label: "Collecties, galeries of labels",
        type: "textarea",
        placeholder: "Vertegenwoordiging, collecties, platenlabels, samenwerkingen.",
      },
    ],
  },
  {
    id: "heden",
    key: "E",
    title: "Heden",
    description: "Waar sta je nu en waar ga je naartoe?",
    fields: [
      {
        id: "huidig",
        label: "Huidige projecten",
        type: "textarea",
        placeholder: "Waar werk je op dit moment aan?",
      },
      {
        id: "komend",
        label: "Recente of komende events",
        type: "textarea",
        placeholder: "Aankomende releases, exposities of optredens.",
      },
      {
        id: "ambitie",
        label: "Richting en ambities",
        type: "textarea",
        placeholder: "Waar beweegt je werk naartoe?",
      },
      {
        id: "links",
        label: "Website en socials",
        type: "text",
        placeholder: "bv. amirabloom.com, @amirabloom",
      },
    ],
  },
];

export const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "nl", label: "Nederlands" },
  { value: "en", label: "Engels" },
  { value: "de", label: "Duits" },
  { value: "fr", label: "Frans" },
];

export const LENGTH_OPTIONS: { value: Length; label: string }[] = [
  { value: "kort", label: "Kort" },
  { value: "middel", label: "Middel" },
  { value: "lang", label: "Lang" },
];

export const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: "formeel", label: "Formeel" },
  { value: "kritisch", label: "Kritisch" },
  { value: "warm", label: "Warm" },
  { value: "speels", label: "Speels" },
];

export const PERSPECTIVE_OPTIONS: { value: Perspective; label: string }[] = [
  { value: "derde", label: "Derde persoon" },
  { value: "eerste", label: "Eerste persoon" },
];

/** Alle veld-ids met hun label, voor het opbouwen van het promptbericht. */
export const FIELD_LABELS: Record<string, { section: string; label: string }> =
  Object.fromEntries(
    SECTIONS.flatMap((s) =>
      s.fields.map((f) => [
        f.id,
        { section: `${s.key} · ${s.title}`, label: f.label },
      ]),
    ),
  );
