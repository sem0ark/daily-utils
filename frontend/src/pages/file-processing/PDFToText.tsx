import { useState, useCallback } from "react";
import { FileUpload } from "./FileUpload";
import clsx from "clsx";
import { CopyToClipboard } from "../../common/components/buttons";
import * as pdfjsLib from "pdfjs-dist";
import {
  removeNonPrintableCharacters,
  MarkdownExtractor,
  type BoundingBox,
  type ParsedPage,
  type WorkerMessage,
  type WorkerInput,
} from "./parser";

import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const processMessage = async (
  { arrayBuffer }: WorkerInput,
  onMessage: (message: WorkerMessage) => void,
) => {
  try {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const results: ParsedPage[] = new Array(numPages);
    let completedPages = 0;

    const processPage = async (pageNum: number) => {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const styles = textContent.styles;

      const items: BoundingBox[] = textContent.items
        .filter((item) => "str" in item)
        .map((item) => {
          const cleanText = removeNonPrintableCharacters(item.str);
          const fontName = item.fontName;
          const style = styles[fontName];

          // 2. Infer Font Size from the Transform Matrix
          // transform[0] is the horizontal scale, transform[3] is vertical (font size)
          const fontSize = Math.abs(item.transform[0]);

          // 3. Infer Bold/Italic from font name or flags
          // PDF font names are strings like "Arial-BoldMT" or "TimesNewRomanPS-Italic"
          const lowerFont = fontName.toLowerCase();
          const isBold =
            lowerFont.includes("bold") ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((style as any)?.fontWeight && (style as any).fontWeight > 500);
          const isItalic =
            lowerFont.includes("italic") || lowerFont.includes("oblique");

          return {
            text: cleanText,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width,
            height: item.height,
            x2: item.transform[4] + item.width,
            y2: item.transform[5] + item.height,
            rowBucket: Math.round(item.transform[5] / 10) * 10,
            metadata: {
              fontSize: Math.round(fontSize * 100) / 100,
              isBold,
              isItalic,
            },
          };
        });

      items.sort((a, b) =>
        b.rowBucket !== a.rowBucket ? b.rowBucket - a.rowBucket : a.x - b.x,
      );
      results[pageNum - 1] = { pageNumber: pageNum, items };

      completedPages++;
      onMessage({
        type: "PROGRESS",
        done: completedPages,
        total: numPages,
        percent: Math.round((completedPages / numPages) * 100),
      } satisfies WorkerMessage);

      page.cleanup();
    };

    const MAX_CONCURRENCY = 5;

    for (let i = 1; i <= numPages; i += MAX_CONCURRENCY) {
      const batch: Promise<void>[] = [];

      for (let j = i; j < i + MAX_CONCURRENCY && j <= numPages; j++) {
        batch.push(processPage(j));
      }

      await Promise.all(batch);
    }

    const extractor = new MarkdownExtractor();
    const markdown = removeNonPrintableCharacters(extractor.extract(results));

    onMessage({ type: "SUCCESS", markdown: markdown } satisfies WorkerMessage);
  } catch (err) {
    onMessage({
      type: "ERROR",
      message: (err as Error).message,
    } satisfies WorkerMessage);
  }
};

const FILE_TYPES = ["application/pdf"];

export function PDFToText() {
  const [status, setStatus] = useState<
    "idle" | "processing" | "done" | "error"
  >("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0, percent: 0 });
  const [result, setResult] = useState("");

  const handleMessage = useCallback(
    (message: WorkerMessage) => {
      if (message.type === "PROGRESS") {
        setProgress({
          done: message.done,
          total: message.total,
          percent: message.percent,
        });
      } else if (message.type === "SUCCESS") {
        setResult(message.markdown);
        setStatus("done");
      } else if (message.type === "ERROR") {
        console.error(message.message);
        setStatus("error");
      }
    },
    [setProgress, setResult, setStatus],
  );

  const handleFileUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      setStatus("processing");
      setResult("");

      const file = files[0];
      const arrayBuffer = await file.arrayBuffer();

      processMessage({ arrayBuffer }, handleMessage);
    },
    [handleMessage],
  );

  const copyToClipboard = () => result;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-8 text-center text-3xl font-bold">PDF to Markdown</h1>

      <div className="flex flex-col gap-6">
        <FileUpload
          onFileUpload={handleFileUpload}
          allowedFileTypes={FILE_TYPES}
          className={clsx(
            status === "processing" && "pointer-events-none opacity-50",
          )}
        />

        {status === "processing" && (
          <div className="rounded-lg border-2 border-neutral-500 bg-neutral-100 p-6">
            <div className="mb-4 flex items-center justify-between text-sm font-bold">
              <span>Processing Document...</span>
              <span className="text-blue-500">
                {progress.done} / {progress.total} Pages
              </span>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-sm border-2 border-neutral-500 bg-white">
              <div
                className="h-full bg-blue-500 transition-all duration-300 ease-out"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}

        {status === "done" && (
          <div className="group animate-in fade-in slide-in-from-bottom-4 relative">
            <div className="flex items-center justify-between rounded-t-lg border-2 border-b-0 border-neutral-500 bg-neutral-100 px-4 py-2">
              <span className="text-sm font-bold">Markdown Output</span>
              <CopyToClipboard
                getText={copyToClipboard}
                disabled={status !== "done"}
              />
            </div>

            <textarea
              readOnly
              value={result}
              className="min-h-[400px] w-full resize-none rounded-b-lg border-2 border-neutral-500 bg-neutral-50 p-6 font-mono text-sm text-neutral-800 outline-none focus:bg-white"
            />
          </div>
        )}

        {status === "error" && (
          <div className="rounded-lg border-2 border-red-500 bg-red-50 p-4 font-bold text-red-600">
            Extraction failed. Please ensure the PDF is not encrypted.
          </div>
        )}
      </div>
    </div>
  );
}
