"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { OutputSettingsControls } from "@/components/output-settings";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { SECTIONS } from "@/lib/questionnaire";
import { loadDraft, saveDraft } from "@/lib/storage";
import { DEFAULT_SETTINGS, type Answers, type OutputSettings } from "@/lib/types";

const TOTAL_STEPS = SECTIONS.length + 1; // secties A–E + output-instellingen
const SETTINGS_STEP = SECTIONS.length;

export default function NewPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [settings, setSettings] = useState<OutputSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setAnswers(draft.answers);
      setSettings(draft.settings);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveDraft({ answers, settings });
  }, [answers, settings, hydrated]);

  const section = step < SETTINGS_STEP ? SECTIONS[step] : null;
  const progress = useMemo(
    () => Math.round(((step + 1) / TOTAL_STEPS) * 100),
    [step],
  );

  function setField(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function missingRequired(): string | null {
    if (!section) return null;
    const empty = section.fields.find(
      (f) => f.required && !answers[f.id]?.trim(),
    );
    return empty ? empty.label : null;
  }

  function next() {
    const missing = missingRequired();
    if (missing) {
      toast.error(`Vul "${missing}" in om verder te gaan.`);
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function generate() {
    if (!answers.naam?.trim()) {
      toast.error("Een naam of artiestennaam is nodig om een bio te maken.");
      setStep(0);
      return;
    }
    saveDraft({ answers, settings });
    router.push("/result");
  }

  return (
    <main className="container max-w-2xl py-10">
      <div className="mb-8 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <ArrowLeft />
            Home
          </Link>
        </Button>
        <span className="text-sm text-muted-foreground">
          Stap {step + 1} van {TOTAL_STEPS}
        </span>
      </div>

      <Progress value={progress} className="mb-8" />

      {section ? (
        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Sectie {section.key}
            </p>
            <CardTitle className="display-serif text-2xl">
              {section.title}
            </CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {section.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>
                  {field.label}
                  {field.required && (
                    <span className="ml-1 text-destructive">*</span>
                  )}
                </Label>
                {field.type === "textarea" ? (
                  <Textarea
                    id={field.id}
                    placeholder={field.placeholder}
                    value={answers[field.id] ?? ""}
                    onChange={(e) => setField(field.id, e.target.value)}
                  />
                ) : (
                  <Input
                    id={field.id}
                    placeholder={field.placeholder}
                    value={answers[field.id] ?? ""}
                    onChange={(e) => setField(field.id, e.target.value)}
                  />
                )}
                {field.hint && (
                  <p className="text-xs text-muted-foreground">{field.hint}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Sectie F
            </p>
            <CardTitle className="display-serif text-2xl">
              Output-instellingen
            </CardTitle>
            <CardDescription>
              Bepaal hoe de biografie klinkt. Je kunt dit later op de
              resultaatpagina nog aanpassen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OutputSettingsControls settings={settings} onChange={setSettings} />
          </CardContent>
        </Card>
      )}

      <div className="mt-8 flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={back}
          disabled={step === 0}
          className={step === 0 ? "invisible" : ""}
        >
          <ArrowLeft />
          Terug
        </Button>

        {step < SETTINGS_STEP ? (
          <Button onClick={next}>
            Volgende
            <ArrowRight />
          </Button>
        ) : (
          <Button onClick={generate}>
            <Sparkles />
            Genereer bio
          </Button>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Verplichte velden zijn gemarkeerd met *. De rest is optioneel — de
        biografie vult ontbrekende delen niet zelf in, maar geeft aan wat nog
        ontbreekt.
      </p>
    </main>
  );
}
