# Budgetboek online zetten (frontend op Vercel, backend op Render)

Doel: een werkende publieke URL die je op je telefoon kunt openen. De frontend
(React/Vite) komt op **Vercel**, de backend (Node/Express + SQLite) op **Render**.
Beide bouwen automatisch vanuit deze GitHub-repo — je hoeft niets lokaal te draaien.

> De repo is hier al klaar voor gemaakt: `vercel.json` (frontend-build) en
> `render.yaml` (backend-blueprint) staan in de root.

De twee diensten verwijzen naar elkaar, dus de volgorde is: **eerst backend, dan
frontend, dan twee URL's invullen.**

---

## 1. Backend op Render

1. Maak een gratis account op <https://render.com> en koppel je GitHub.
2. **New → Blueprint** → kies de repo `kreamart-art/NewAvailable` → Render leest
   `render.yaml` en stelt de service `budgetboek-backend` voor. Klik **Apply**.
3. Tijdens het aanmaken vraagt Render om de waarden met `sync:false`:
   - `CORS_ORIGIN` — vul dit **later** in (stap 3) met je Vercel-URL. Zet voorlopig
     bijv. `*` zodat het bouwt; je scherpt het straks aan.
   - `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — genereer eenmalig een paar met:
     ```bash
     npx web-push generate-vapid-keys
     ```
     en plak de twee waarden. (Leeg laten mag ook → dan staat push uit.)
   - `JWT_SECRET` wordt automatisch gegenereerd.
4. Na de eerste deploy krijg je een URL als
   `https://budgetboek-backend.onrender.com`. Test:
   `https://budgetboek-backend.onrender.com/health` → `{ "ok": true }`.

> **Gratis plan:** de service slaapt na ~15 min inactiviteit (eerste verzoek
> daarna is traag) en de SQLite-data reset bij herstart. Prima om te bekijken;
> voor blijvende data zie het `disk`-blok onderin `render.yaml` (betaald plan).

## 2. Frontend op Vercel

1. Maak een account op <https://vercel.com> en koppel GitHub.
2. **Add New → Project** → importeer `kreamart-art/NewAvailable`.
   Vercel leest `vercel.json` (geen framework-instellingen nodig).
3. Voeg onder **Environment Variables** toe:
   - `VITE_API_URL` = je Render-URL uit stap 1, bijv.
     `https://budgetboek-backend.onrender.com`
4. **Deploy.** Je krijgt een URL als `https://new-available.vercel.app`.

## 3. De twee aan elkaar knopen

1. Ga terug naar Render → service → **Environment** → zet `CORS_ORIGIN` op je
   exacte Vercel-URL (bijv. `https://new-available.vercel.app`, zonder slash op
   het eind). Sla op → Render herstart.
2. Open de Vercel-URL op je telefoon. Registreer een account en de app werkt:
   transacties, budgetten, prognose, doelen.

## 4. (Optioneel) Pushberichten op de telefoon

- Push werkt op iPhone alleen als je de site via Safari **"Zet op beginscherm"**
  toevoegt (de PWA-manifest + iconen staan al klaar). Daarna kun je in
  *Instellingen → Pushberichten* meldingen aanzetten en een testmelding sturen.
- Vereist dat `VAPID_*` op Render zijn ingevuld.

---

## Waarom niet alles op één plek?

De backend gebruikt `better-sqlite3` (een native module met een bestand op schijf)
en draait als langlopende server. Dat past niet op Vercels serverless-functies,
maar wél op een gewone Node-host als Render/Railway/Fly. Vandaar de splitsing.
Wil je later één host met blijvende, schaalbare opslag: migreer SQLite naar
Postgres (zie de notitie in `backend/README.md`) — de query-logica blijft gelijk,
alleen de driver verandert.
