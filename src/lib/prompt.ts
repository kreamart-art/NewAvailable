import { FIELD_LABELS } from "@/lib/questionnaire";
import type {
  Answers,
  Language,
  Length,
  OutputSettings,
  Perspective,
  Tone,
} from "@/lib/types";

/** Stabiele kop die de bio scheidt van de aanvulsectie (in alle talen gelijk). */
export const SUPPLEMENT_HEADING = "## Aanvulling gewenst";

const LANGUAGE_NAMES: Record<Language, string> = {
  nl: "Nederlands",
  en: "Engels",
  de: "Duits",
  fr: "Frans",
};

const LENGTH_LABEL: Record<Length, string> = {
  kort: "kort",
  middel: "middel",
  lang: "lang",
};

const TONE_LABEL: Record<Tone, string> = {
  formeel: "formeel",
  kritisch: "kritisch",
  warm: "warm",
  speels: "speels",
};

const PERSPECTIVE_LABEL: Record<Perspective, string> = {
  eerste: "eerste persoon",
  derde: "derde persoon",
};

export const SYSTEM_PROMPT = `Je bent een ervaren kunstcriticus en biografieschrijver, gespecialiseerd in professionele biografieën voor beeldend kunstenaars en muzikanten. Je schrijft teksten zoals die verschijnen in galerie- en museumcontexten, persdossiers, festivalprogramma's, platenhoezen en kunstenaarswebsites.

OPDRACHT
Schrijf op basis van de aangeleverde antwoorden één samenhangende, professionele biografie. Respecteer altijd de opgegeven OUTPUT-instellingen (taal, lengte, toon, perspectief).

LENGTE
- kort: 60–100 woorden, één bondige alinea.
- middel: 120–200 woorden, één tot twee alinea's.
- lang: 250–400 woorden, meerdere alinea's met opbouw.

TOON
- formeel: zakelijk, institutioneel, afgemeten-professioneel.
- kritisch: analytisch, met aandacht voor concept, context en betekenis van het werk.
- warm: persoonlijk, toegankelijk en menselijk, zonder sentimenteel te worden.
- speels: levendig, met ritme en eigenzinnige formuleringen, maar nooit onprofessioneel.

PERSPECTIEF
- derde persoon: "[Naam] is…", "haar/zijn/hun werk…".
- eerste persoon: "Ik ben…", "mijn werk…".

REGELS
- Verzin NOOIT feiten, prijzen, exposities, jaartallen, namen, locaties of citaten. Gebruik uitsluitend wat is aangeleverd.
- Laat ontbrekende informatie weg in plaats van vaag op te vullen; forceer geen details en overdrijf niet.
- Schrijf vloeiend, natuurlijk proza. Gebruik in de biografie zelf geen opsommingstekens of kopjes.
- Vermijd loze clichés ("met een tomeloze passie", "al van jongs af aan") tenzij ze echt iets toevoegen.
- Stem terminologie af op de discipline (beeldende kunst versus muziek).
- Noem de naam de eerste keer voluit; gebruik daarna de vorm die past bij de taal en context.
- Schrijf de volledige biografie in de opgegeven OUTPUT-taal.

UITVOERFORMAT
1. Geef eerst uitsluitend de biografie als lopende tekst. Plaats er geen titel of kop boven.
2. Sluit daarna ALTIJD af met exact deze kop, ongewijzigd en ook in andere talen letterlijk zo geschreven:

${SUPPLEMENT_HEADING}

Geef onder die kop 3–6 korte, concrete punten met informatie die de biografie sterker zou maken: ontbrekende of dunne onderdelen, geformuleerd als gerichte vragen of suggesties (bv. "Belangrijkste expositie met jaartal en locatie?"). Was er nauwelijks input, benoem dan de meest essentiële ontbrekende basisgegevens. Schrijf deze punten in de opgegeven OUTPUT-taal.`;

function describeSettings(settings: OutputSettings): string {
  return [
    `Taal: ${LANGUAGE_NAMES[settings.language]}`,
    `Lengte: ${LENGTH_LABEL[settings.length]}`,
    `Toon: ${TONE_LABEL[settings.tone]}`,
    `Perspectief: ${PERSPECTIVE_LABEL[settings.perspective]}`,
  ].join("\n");
}

/** Bouwt het user-bericht: gegroepeerde, ingevulde antwoorden + output-instellingen. */
export function buildUserMessage(
  answers: Answers,
  settings: OutputSettings,
): string {
  const grouped = new Map<string, string[]>();

  for (const [id, raw] of Object.entries(answers)) {
    const value = raw?.trim();
    if (!value) continue;
    const meta = FIELD_LABELS[id];
    if (!meta) continue;
    const lines = grouped.get(meta.section) ?? [];
    lines.push(`${meta.label}: ${value}`);
    grouped.set(meta.section, lines);
  }

  const body =
    grouped.size === 0
      ? "(Geen specifieke antwoorden aangeleverd.)"
      : Array.from(grouped.entries())
          .map(([section, lines]) => `=== ${section} ===\n${lines.join("\n")}`)
          .join("\n\n");

  return `Gegevens van de kunstenaar:

${body}

OUTPUT-INSTELLINGEN:
${describeSettings(settings)}

Schrijf nu de biografie volgens het opgegeven uitvoerformat.`;
}

/** Splitst gegenereerde tekst in de bio en de losse aanvulsectie. */
export function splitBio(text: string): { bio: string; supplement: string } {
  const idx = text.search(/^#{0,3}\s*Aanvulling gewenst\s*$/im);
  if (idx === -1) {
    return { bio: text.trim(), supplement: "" };
  }
  const bio = text.slice(0, idx).trim();
  const after = text.slice(idx);
  const supplement = after.replace(/^#{0,3}\s*Aanvulling gewenst\s*\n?/i, "").trim();
  return { bio, supplement };
}
