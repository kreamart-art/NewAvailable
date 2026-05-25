"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Loader2,
  Pencil,
  RotateCcw,
} from "lucide-react";
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
import { streamBio } from "@/lib/generate-client";
import { splitBio } from "@/lib/prompt";
import { loadDraft, saveDraft } from "@/lib/storage";
import { type Answers, type OutputSettings } from "@/lib/types";

type Status = "loading" | "streaming" | "done" | "error";

export default function ResultPage() {
  const [ready, setReady] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [settings, setSettings] = useState<OutputSettings | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("loading");
  const [copied, setCopied] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(false);

  const generate = useCallback(
    async (a: Answers, s: OutputSettings) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setText("");
      setStatus("streaming");

      try {
        await streamBio(
          { answers: a, settings: s },
          {
            signal: controller.signal,
            onChunk: (chunk) => setText((prev) => prev + chunk),
          },
        );
        if (!controller.signal.aborted) setStatus("done");
      } catch (err) {
        if (controller.signal.aborted) return;
        setStatus("error");
        toast.error(
          err instanceof Error ? err.message : "Genereren mislukt.",
        );
      }
    },
    [],
  );

  useEffect(() => {
    const draft = loadDraft();
    setReady(true);
    if (!draft || !draft.answers.naam?.trim()) {
      setHasDraft(false);
      return;
    }
    setHasDraft(true);
    setAnswers(draft.answers);
    setSettings(draft.settings);
    if (!startedRef.current) {
      startedRef.current = true;
      void generate(draft.answers, draft.settings);
    }
    return () => abortRef.current?.abort();
  }, [generate]);

  function applySettings(next: OutputSettings) {
    setSettings(next);
    saveDraft({ answers, settings: next });
    void generate(answers, next);
  }

  const { bio, supplement } = splitBio(text);
  const isBusy = status === "streaming" || status === "loading";

  async function copyBio() {
    if (!bio) return;
    try {
      await navigator.clipboard.writeText(bio);
      setCopied(true);
      toast.success("Biografie gekopieerd.");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Kopiëren niet gelukt.");
    }
  }

  function downloadBio() {
    if (!bio) return;
    const name = answers.naam?.trim() || "biografie";
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const blob = new Blob([bio], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug || "biografie"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (ready && !hasDraft) {
    return (
      <main className="container flex min-h-screen max-w-xl flex-col items-center justify-center text-center">
        <h1 className="display-serif text-3xl">Nog geen gegevens</h1>
        <p className="mt-3 text-muted-foreground">
          Vul eerst de vragenlijst in om een biografie te genereren.
        </p>
        <Button asChild className="mt-6">
          <Link href="/new">Start je bio</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="container max-w-3xl py-10">
      <div className="mb-8 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/new">
            <ArrowLeft />
            Vragenlijst aanpassen
          </Link>
        </Button>
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          ArtistBio
        </span>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Pencil className="h-4 w-4" />
            Toon &amp; lengte
          </CardTitle>
          <CardDescription>
            Wijzig een instelling om de biografie opnieuw te genereren.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settings && (
            <OutputSettingsControls
              settings={settings}
              onChange={applySettings}
              layout="row"
              disabled={isBusy}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle className="display-serif text-2xl">Biografie</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyBio}
              disabled={!bio || isBusy}
            >
              {copied ? <Check /> : <Copy />}
              Kopiëren
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadBio}
              disabled={!bio || isBusy}
            >
              <Download />
              .txt
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => settings && generate(answers, settings)}
              disabled={isBusy || !settings}
            >
              <RotateCcw />
              Regenereren
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {status === "loading" || (status === "streaming" && !bio) ? (
            <div className="flex items-center gap-3 py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Biografie wordt geschreven…</span>
            </div>
          ) : (
            <article className="space-y-4 text-[15px] leading-relaxed">
              {bio
                .split(/\n{2,}/)
                .filter(Boolean)
                .map((para, i) => (
                  <p key={i} className="whitespace-pre-line">
                    {para}
                  </p>
                ))}
              {status === "streaming" && (
                <span className="inline-block h-4 w-2 animate-pulse bg-foreground align-middle" />
              )}
            </article>
          )}
        </CardContent>
      </Card>

      {supplement && (
        <Card className="mt-6 border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Aanvulling gewenst</CardTitle>
            <CardDescription>
              Met deze informatie wordt de biografie completer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {supplement
                .split("\n")
                .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
                .filter(Boolean)
                .map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                    <span>{item}</span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
