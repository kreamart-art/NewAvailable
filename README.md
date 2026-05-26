# ArtistBio

Web-app die op basis van een gestructureerde vragenlijst een professionele
biografie genereert voor beeldend kunstenaars en muzikanten, via de Anthropic
Claude API.

## Stack

- **Next.js 14** (App Router) + **TypeScript** (strict mode)
- **Tailwind CSS** + **shadcn/ui**-componenten
- **Anthropic Claude API** met streaming via Server-Sent Events
- Geen database: concepten worden lokaal opgeslagen in `localStorage`

## Pagina's

| Route     | Functie                                                                       |
| --------- | ----------------------------------------------------------------------------- |
| `/`       | Landingspagina met één CTA: _Start je bio_                                     |
| `/new`    | Multi-step vragenlijst (A–F) met voortgangsbalk en tussentijdse opslag        |
| `/result` | Gegenereerde bio: kopiëren, download `.txt`, regenereren, toon/lengte wijzigen |

## Lokaal draaien

1. Installeer dependencies:

   ```bash
   npm install
   ```

2. Maak `.env.local` aan (zie `.env.local.example`):

   ```bash
   cp .env.local.example .env.local
   ```

   Vul je sleutel in:

   ```
   ANTHROPIC_API_KEY=sk-ant-...
   # optioneel
   ANTHROPIC_MODEL=claude-sonnet-4-6
   ```

3. Start de dev-server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Scripts

- `npm run dev` — ontwikkelserver
- `npm run build` — productiebuild
- `npm run start` — productieserver
- `npm run typecheck` — TypeScript-controle zonder build
- `npm run lint` — Next.js lint

## Environment variables

| Variabele           | Vereist | Omschrijving                                                       |
| ------------------- | ------- | ------------------------------------------------------------------ |
| `ANTHROPIC_API_KEY` | Ja      | Anthropic API-sleutel. Wordt **uitsluitend serverside** gebruikt.  |
| `ANTHROPIC_MODEL`   | Nee     | Modelnaam. Standaard `claude-sonnet-4-6`.                          |

De API-sleutel verlaat de server nooit: generatie loopt via de server-route
`/api/generate`, die de Claude-respons als SSE-stream terugstuurt naar de client.

## Deployment (Vercel)

1. Push deze repo naar GitHub en importeer het project in Vercel.
2. Zet onder **Settings → Environment Variables**:
   - `ANTHROPIC_API_KEY` (vereist)
   - `ANTHROPIC_MODEL` (optioneel)
3. Deploy. De route `/api/generate` draait op de Node.js-runtime.

## Aanpassen van de vragenlijst en de prompt

> **Let op:** de oorspronkelijke opdracht verwees naar een vragenlijst en een
> system prompt "uit het vorige bericht" die niet waren meegeleverd. Hieronder
> staan de plekken waar je die één-op-één kunt vervangen door je eigen versies.

- **Vragenlijst-velden:** `src/lib/questionnaire.ts` — pas de `SECTIONS`-array aan
  (secties, velden, labels, placeholders, verplichte velden).
- **System prompt:** `src/lib/prompt.ts` — `SYSTEM_PROMPT` en `buildUserMessage()`
  bepalen wat er naar Claude gestuurd wordt.
- **Output-instellingen** (taal/lengte/toon/perspectief): de opties staan in
  `src/lib/questionnaire.ts`, de typen in `src/lib/types.ts`.

De bio en de sectie "Aanvulling gewenst" worden gescheiden op de vaste kop
`## Aanvulling gewenst` (zie `splitBio()` in `src/lib/prompt.ts`).
