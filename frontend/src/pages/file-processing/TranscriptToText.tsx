import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { CopyToClipboard } from "../../common/components/buttons";
import { formatAsText, segmentTranscript } from "./transcriptionFormatter";
import type {
  TranscriptData,
  SegmentationOptions,
} from "./transcriptionFormatter";
import { parseTranscript } from "./transcriptParser";
import type { ParsedTranscript } from "./transcriptParser";

const isUrl = (str: string): boolean => {
  try {
    new URL(str);
    console.log("[TranscriptToText] Detected URL:", str);
    return true;
  } catch {
    return false;
  }
};

const parseInput = async (input: string): Promise<ParsedTranscript> => {
  console.log("[TranscriptToText] Processing input, length:", input.length);

  let text = input;

  if (isUrl(input)) {
    console.log("[TranscriptToText] Processing as URL");
    const response = await fetch(input);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    text = await response.text();
    console.log("[TranscriptToText] URL fetched successfully");
  }

  const parsed = parseTranscript(text);
  console.log("[TranscriptToText] Transcript parsed successfully", {
    format: parsed.format,
    events: parsed.data.events?.length,
  });
  return parsed;
};

const formatInput = (
  transcriptData: TranscriptData,
  options: SegmentationOptions = {},
): string => {
  const result = segmentTranscript(transcriptData, options);
  console.log("[TranscriptToText] Transcript segmented successfully", {
    paragraphs: result.paragraphs.length,
    sentences: result.sentences.length,
    words: result.words.length,
  });
  return formatAsText(result);
};

const processInput = async (
  input: string,
  options: SegmentationOptions,
  parsed?: ParsedTranscript,
): Promise<string> => {
  try {
    return formatInput((parsed ?? (await parseInput(input))).data, options);
  } catch (error) {
    console.error("[TranscriptToText] Error:", error);
    throw error;
  }
};

interface TranscriptInputProps {
  onProcess: (
    input: string,
    options: SegmentationOptions,
    parsed?: ParsedTranscript,
  ) => Promise<{ success: boolean; error?: string; data?: string }>;
  isLoading?: boolean;
}

const TranscriptInput = ({
  onProcess,
  isLoading = false,
}: TranscriptInputProps) => {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedTranscript, setParsedTranscript] =
    useState<ParsedTranscript | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [sentenceThreshold, setSentenceThreshold] = useState(6);
  const [paragraphBandwidthScale, setParagraphBandwidthScale] = useState(1.5);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatOptions = useMemo(
    () => ({ sentenceThreshold, paragraphBandwidthScale }),
    [paragraphBandwidthScale, sentenceThreshold],
  );

  const preview = useMemo(() => {
    if (!parsedTranscript) return "";
    return formatInput(parsedTranscript.data, {
      ...formatOptions,
      maxWords: 1000,
    });
  }, [formatOptions, parsedTranscript]);

  useEffect(() => {
    if (!input.trim()) {
      setParsedTranscript(null);
      setPreviewError(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      parseInput(input)
        .then((parsed) => {
          if (cancelled) return;
          setParsedTranscript(parsed);
          setPreviewError(false);
        })
        .catch(() => {
          if (cancelled) return;
          setParsedTranscript(null);
          setPreviewError(true);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [input]);

  const handleInput = (text: string) => {
    console.log("[TranscriptInput] Input changed, length:", text.length);
    setInput(text);
    setParsedTranscript(null);
    setPreviewError(false);
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    console.log("[TranscriptInput] File dropped");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === "application/json" || file.type === "text/plain") {
        try {
          const text = await file.text();
          handleInput(text);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to read file");
        }
      } else {
        setError("Please drop a JSON3 or SRT file");
      }
    }
  };

  const handeGetText = async () => {
    console.log("[TranscriptInput] handleGetText (Copy triggered)");
    if (!input.trim()) {
      setError("Please enter JSON3, SRT, or a URL");
      throw new Error("Empty input");
    }
    const res = await onProcess(
      input,
      formatOptions,
      parsedTranscript ?? undefined,
    );
    if (!res.success) {
      setError(res.error || "Failed to process input");
      throw new Error(res.error || "Failed to process input");
    }
    return res.data || "";
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative min-h-32 rounded-xl border-2 transition-all ${
        isDragging
          ? "border-blue-500 bg-blue-50"
          : "border-neutral-500 bg-white"
      } p-2`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.srt,application/json,text/plain"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            const file = e.target.files[0];
            file.text().then(handleInput);
          }
        }}
        className="hidden"
      />

      {isDragging && (
        <div className="bg-opacity-10 absolute inset-0 flex items-center justify-center rounded-xl bg-blue-500 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-lg font-semibold text-blue-600">
              Drop JSON3 or SRT file here
            </p>
          </div>
        </div>
      )}

      <div className="flex w-full flex-row gap-2">
        <div className="flex w-full flex-col gap-2">
          {input.length > 50000 ? (
            <div className="flex h-36 w-full flex-col items-center justify-center rounded-lg border-2 border-neutral-200 bg-neutral-50 p-4">
              <p className="font-semibold text-neutral-600">
                Large file loaded ({Math.round(input.length / 1024)} KB)
              </p>
              <button
                onClick={() => setInput("")}
                className="mt-2 text-blue-500 hover:underline"
              >
                Clear input
              </button>
            </div>
          ) : (
            <textarea
              value={input}
              onChange={(e) => handleInput(e.target.value)}
              disabled={isLoading}
              className="h-36 w-full scroll-m-0 rounded-lg border-2 border-neutral-200 bg-neutral-100 p-2 font-mono ring-0 outline-none focus:border-neutral-500 disabled:bg-neutral-200"
              placeholder="Paste JSON3 or SRT transcript or URL here... (or drag & drop a file)"
            />
          )}
          {error && (
            <div className="rounded-lg border-2 border-red-500 bg-red-100 p-2 text-red-700">
              {error}
            </div>
          )}
        </div>

        <CopyToClipboard getText={handeGetText} bigger disabled={isLoading} />
      </div>

      <div className="mt-4 grid gap-3 rounded-lg border-2 border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-neutral-700">
          <span className="flex justify-between font-semibold">
            <span>Sentence splitting</span>
            <span>{sentenceThreshold.toFixed(1)}</span>
          </span>
          <input
            type="range"
            min="3"
            max="9"
            step="0.5"
            value={sentenceThreshold}
            onChange={(e) => setSentenceThreshold(Number(e.target.value))}
            disabled={isLoading}
            aria-label="Sentence splitting threshold"
            className="accent-blue-500"
          />
          <span className="text-neutral-500">
            Lower values create more sentence breaks.
          </span>
        </label>
        <label className="flex flex-col gap-1 text-neutral-700">
          <span className="flex justify-between font-semibold">
            <span>Paragraph splitting</span>
            <span>{paragraphBandwidthScale.toFixed(1)}</span>
          </span>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={paragraphBandwidthScale}
            onChange={(e) => setParagraphBandwidthScale(Number(e.target.value))}
            disabled={isLoading}
            aria-label="Paragraph splitting bandwidth"
            className="accent-blue-500"
          />
          <span className="text-neutral-500">
            Lower values create more paragraph breaks.
          </span>
        </label>
      </div>

      <div className="mt-4 rounded-lg border-2 border-neutral-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-semibold text-neutral-800">Preview</h2>
          <span className="text-neutral-500">First 1,000 words</span>
        </div>
        {previewError ? (
          <p className="text-neutral-500">
            Preview unavailable until the input is valid JSON3 or SRT.
          </p>
        ) : preview ? (
          <pre className="max-h-96 overflow-auto font-mono whitespace-pre-wrap text-neutral-800">
            {preview}
          </pre>
        ) : (
          <p className="text-neutral-500">
            Paste or import a JSON3 or SRT transcript to preview the formatting.
          </p>
        )}
      </div>
    </div>
  );
};

export function TranscriptToText() {
  const [isLoading, setIsLoading] = useState(false);

  const handleProcess = useCallback(
    async (
      input: string,
      options: SegmentationOptions,
      parsed?: ParsedTranscript,
    ): Promise<{ success: boolean; error?: string; data?: string }> => {
      console.log("[TranscriptToText] handleProcess called");
      setIsLoading(true);
      try {
        const formatted = await processInput(input, options, parsed);
        console.log("[TranscriptToText] Process succeeded");
        return { success: true, data: formatted };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to process";
        console.error("[TranscriptToText] Process failed:", message);
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-8 text-center text-3xl font-bold">
        Transcript to Text
      </h1>

      <div className="my-5 flex flex-col gap-4">
        <TranscriptInput onProcess={handleProcess} isLoading={isLoading} />
      </div>
    </div>
  );
}
