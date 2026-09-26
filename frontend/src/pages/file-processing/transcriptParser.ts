import type { TranscriptData, TranscriptEvent } from "./transcriptionFormatter";

export type TranscriptFormat = "json3" | "srt";

export interface ParsedTranscript {
  format: TranscriptFormat;
  data: TranscriptData;
}

const SRT_TIMECODE =
  /^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2})[,.](\d{3})(?:\s+.*)?$/;
const SRT_TIMESTAMP = /^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/;

function timestampToMilliseconds(value: string): number {
  const match = value.match(SRT_TIMESTAMP);
  if (!match) throw new Error(`Invalid SRT timecode: ${value}`);

  const [, startHours, startMinutes, startSeconds, startMilliseconds] = match;
  return (
    Number(startHours) * 3_600_000 +
    Number(startMinutes) * 60_000 +
    Number(startSeconds) * 1_000 +
    Number(startMilliseconds)
  );
}

function parseTimecodeLine(line: string): { startMs: number; endMs: number } {
  const match = line.match(SRT_TIMECODE);
  if (!match) throw new Error(`Invalid SRT timecode line: ${line}`);

  const start = match
    .slice(1, 5)
    .join(":")
    .replace(/:(\d{3})$/, ",$1");
  const end = match
    .slice(5, 9)
    .join(":")
    .replace(/:(\d{3})$/, ",$1");
  const startMs = timestampToMilliseconds(start);
  const endMs = timestampToMilliseconds(end);

  if (endMs < startMs)
    throw new Error("SRT end time cannot precede start time");
  return { startMs, endMs };
}

function isJson3Data(value: unknown): value is TranscriptData {
  if (!value || typeof value !== "object") return false;
  const data = value as { wireMagic?: unknown; events?: unknown };
  return data.wireMagic === "pb3" && Array.isArray(data.events);
}

export function parseJson3(input: string): TranscriptData {
  let value: unknown;
  try {
    value = JSON.parse(input.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("Input is not valid JSON3 or SRT");
  }

  if (!isJson3Data(value)) {
    throw new Error("JSON input is not a valid JSON3 transcript");
  }

  const data = value as {
    events: {
      tStartMs?: unknown;
      segs?: { utf8?: unknown; tOffsetMs?: unknown }[];
    }[];
  };

  return {
    events: data.events.map((event) => ({
      tStartMs: typeof event.tStartMs === "number" ? event.tStartMs : undefined,
      segs: event.segs?.map((segment) => ({
        utf8: typeof segment.utf8 === "string" ? segment.utf8 : undefined,
        tOffsetMs:
          typeof segment.tOffsetMs === "number" ? segment.tOffsetMs : undefined,
      })),
    })),
  };
}

export function parseSrt(input: string): TranscriptData {
  const normalized = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const events: TranscriptEvent[] = [];
  let index = 0;

  while (index < lines.length) {
    while (index < lines.length && !lines[index].trim()) index++;
    if (index >= lines.length) break;

    const possibleIndex = lines[index].trim();
    if (/^\d+$/.test(possibleIndex)) index++;

    while (index < lines.length && !lines[index].trim()) index++;
    if (index >= lines.length) break;

    const timecode = lines[index].trim();
    if (!SRT_TIMECODE.test(timecode)) {
      throw new Error(`Invalid SRT entry near line ${index + 1}`);
    }
    const { startMs } = parseTimecodeLine(timecode);
    index++;

    const textLines: string[] = [];
    while (index < lines.length && lines[index].trim()) {
      textLines.push(lines[index].trim());
      index++;
    }

    const text = textLines.join(" ").trim();
    if (!text) continue;

    events.push({
      tStartMs: startMs,
      segs: text.split(/\s+/).map((utf8, segmentIndex) => ({
        utf8: `${segmentIndex === 0 ? "" : " "}${utf8}`,
      })),
    });
  }

  if (events.length === 0)
    throw new Error("No valid SRT subtitle entries found");
  return { events };
}

export function parseTranscript(input: string): ParsedTranscript {
  const trimmed = input.replace(/^\uFEFF/, "").trim();
  if (!trimmed) throw new Error("Transcript input is empty");

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return { format: "json3", data: parseJson3(trimmed) };
  }

  return { format: "srt", data: parseSrt(trimmed) };
}
