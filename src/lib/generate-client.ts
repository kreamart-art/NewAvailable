import type { GenerateRequest } from "@/lib/types";

interface StreamCallbacks {
  onChunk: (text: string) => void;
  signal?: AbortSignal;
}

/**
 * POST naar /api/generate en lees de Server-Sent Events uit. Roept onChunk aan
 * voor elk tekstfragment. Gooit bij netwerk- of serverfouten.
 */
export async function streamBio(
  payload: GenerateRequest,
  { onChunk, signal }: StreamCallbacks,
): Promise<void> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok || !res.body) {
    let message = "Genereren mislukt. Probeer het opnieuw.";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // geen JSON-body; gebruik standaardbericht
    }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const line = event
        .split("\n")
        .find((l) => l.startsWith("data:"));
      if (!line) continue;
      const json = line.slice(5).trim();
      if (!json) continue;

      const parsed = JSON.parse(json) as {
        type: "chunk" | "done" | "error";
        text?: string;
        message?: string;
      };

      if (parsed.type === "chunk" && parsed.text) {
        onChunk(parsed.text);
      } else if (parsed.type === "error") {
        throw new Error(parsed.message ?? "Er ging iets mis bij het genereren.");
      } else if (parsed.type === "done") {
        return;
      }
    }
  }
}
