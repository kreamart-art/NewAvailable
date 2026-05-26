import Link from "next/link";
import { ArrowRight, FileText, ListChecks, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: ListChecks,
    title: "Vul de vragenlijst in",
    body: "Zes korte secties over je werk, achtergrond en carrière. Alles tussentijds bewaard.",
  },
  {
    icon: Sparkles,
    title: "Laat Claude schrijven",
    body: "Een professionele biografie in jouw gekozen toon, lengte, taal en perspectief.",
  },
  {
    icon: FileText,
    title: "Verfijn en gebruik",
    body: "Pas toon of lengte aan, kopieer of download als .txt — klaar voor je site of persdossier.",
  },
];

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col">
      <header className="container flex items-center justify-between py-6">
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          ArtistBio
        </span>
        <Button asChild variant="ghost" size="sm">
          <Link href="/new">Start je bio</Link>
        </Button>
      </header>

      <section className="bg-grain flex flex-1 items-center">
        <div className="container grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="space-y-8">
            <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
              AI-gestuurde kunstenaarsbiografie
            </p>
            <h1 className="display-serif text-balance text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
              Jouw verhaal verdient meer dan een{" "}
              <span className="italic text-muted-foreground">LinkedIn-bio.</span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              ArtistBio zet een paar gerichte antwoorden om in een verzorgde,
              professionele biografie voor beeldend kunstenaars en muzikanten —
              klaar voor galeries, festivals, persdossiers en je eigen site.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button asChild size="lg">
                <Link href="/new">
                  Start je bio
                  <ArrowRight />
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground">
                Geen account nodig · klaar in enkele minuten
              </span>
            </div>
          </div>

          <ol className="space-y-4">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="flex gap-4 rounded-lg border border-border bg-card/60 p-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
                  <step.icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">
                    <span className="mr-2 text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {step.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="container py-8 text-sm text-muted-foreground">
        Gemaakt met de Anthropic Claude API · je gegevens blijven lokaal in je
        browser.
      </footer>
    </main>
  );
}
