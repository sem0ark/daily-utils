import { useState, useCallback, useRef } from "react";
import { CopyToClipboard } from "../../common/components/buttons";
import { Seo } from "../../common/components/Seo";
import { formatAsText, segmentTranscript } from "./transcriptionFormatter";
import type { Json3Data } from "./transcriptionFormatter";

const isUrl = (str: string): boolean => {
  try {
    new URL(str);
    console.log("[TranscriptToText] Detected URL:", str);
    return true;
  } catch {
    return false;
  }
};

const processInput = async (input: string): Promise<string> => {
  console.log("[TranscriptToText] Processing input, length:", input.length);

  try {
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

    console.log("[TranscriptToText] Parsing JSON...");
    const json3Data = JSON.parse(text) as Json3Data;
    console.log("[TranscriptToText] JSON parsed successfully", {
      events: json3Data.events?.length,
    });

    const result = segmentTranscript(json3Data);
    console.log("[TranscriptToText] Transcript segmented successfully", {
      paragraphs: result.paragraphs.length,
      sentences: result.sentences.length,
      words: result.words.length,
    });

    return formatAsText(result);
  } catch (error) {
    console.error("[TranscriptToText] Error:", error);
    throw error;
  }
};

interface TranscriptInputProps {
  onProcess: (
    input: string,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInput = (text: string) => {
    console.log("[TranscriptInput] Input changed, length:", text.length);
    setInput(text);
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
      if (file.type === "application/json" || file.name.endsWith(".json")) {
        try {
          const text = await file.text();
          setInput(text);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to read file");
        }
      } else {
        setError("Please drop a JSON file");
      }
    }
  };

  const handeGetText = async () => {
    console.log("[TranscriptInput] handleGetText (Copy triggered)");
    if (!input.trim()) {
      setError("Please enter JSON or a URL");
      throw new Error("Empty input");
    }
    const res = await onProcess(input);
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
        accept=".json"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            const file = e.target.files[0];
            file.text().then((text) => setInput(text));
          }
        }}
        className="hidden"
      />

      {isDragging && (
        <div className="bg-opacity-10 absolute inset-0 flex items-center justify-center rounded-xl bg-blue-500 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-lg font-semibold text-blue-600">
              Drop JSON file here
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
              placeholder="Paste JSON3 transcript or URL here... (or drag & drop JSON file)"
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
    </div>
  );
};

export function TranscriptToText() {
  const [isLoading, setIsLoading] = useState(false);

  const handleProcess = useCallback(
    async (
      input: string,
    ): Promise<{ success: boolean; error?: string; data?: string }> => {
      console.log("[TranscriptToText] handleProcess called");
      setIsLoading(true);
      try {
        const formatted = await processInput(input);
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
      <Seo 
        title="Transcript to Text" 
        description="Clean up and format transcriptions from YouTube or voice-to-text services."
        canonical="/file-processing/transcript-to-text"
      />
      <h1 className="mb-8 text-center text-3xl font-bold">
        Transcript to Text
      </h1>

      <div className="my-5 flex flex-col gap-4">
        <TranscriptInput onProcess={handleProcess} isLoading={isLoading} />
      </div>
    </div>
  );
}
