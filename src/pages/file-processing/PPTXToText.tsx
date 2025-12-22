import { useState, useCallback } from "react";
import { FileUpload } from "./FileUpload";
import clsx from "clsx";
import { CopyToClipboard } from "../../common/components/buttons";
import {
  MarkdownExtractor,
  type BoundingBox,
  type ParsedPage,
  type WorkerMessage,
  type WorkerInput,
} from "./parser";

import JSZip from "jszip";

const processMessage = async (
  { arrayBuffer }: WorkerInput,
  onMessage: (message: WorkerMessage) => void,
) => {
  const zip = new JSZip();
  try {
    const contents = await zip.loadAsync(arrayBuffer);

    // 1. Identify all slide files (ppt/slides/slide1.xml, etc.)
    const slideFiles = Object.keys(contents.files).filter(
      (path) => path.startsWith("ppt/slides/slide") && path.endsWith(".xml"),
    );

    const numSlides = slideFiles.length;
    const results: ParsedPage[] = new Array(numSlides);
    let completedSlides = 0;

    // 2. Helper to process a single slide's XML
    const processSlide = async (path: string, index: number) => {
      const xmlText = await contents.file(path)!.async("text");
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");

      // PPTX stores text in shapes <p:sp>
      const shapes = Array.from(xmlDoc.getElementsByTagName("p:sp"));

      const items: BoundingBox[] = shapes
        .map((shape) => {
          const xfrm = shape.getElementsByTagName("a:xfrm")[0];
          const off = xfrm?.getElementsByTagName("a:off")[0];
          const ext = xfrm?.getElementsByTagName("a:ext")[0];

          // 1. Identify if it's a "Title" placeholder
          // PPTX uses <p:nvSpPr> to store non-visual properties like placeholder types
          // const nvSpPr = shape.getElementsByTagName("p:nvSpPr")[0];
          // const ph = nvSpPr?.getElementsByTagName("p:ph")[0];
          // const phType = ph?.getAttribute("type");
          // const isHeading = phType === "title" || phType === "ctrTitle";

          const emuToPx = (emu: string | null) =>
            emu ? parseInt(emu) / 12700 : 0;

          // 2. Extract Text + Formatting from Runs
          const paragraphs = Array.from(shape.getElementsByTagName("a:p"));
          let fullText = "";
          let isBold = false;
          let isItalic = false;
          let fontSize = 0;

          paragraphs.forEach((p) => {
            const runs = Array.from(p.getElementsByTagName("a:r"));
            runs.forEach((r) => {
              const rPr = r.getElementsByTagName("a:rPr")[0];
              const text = r.getElementsByTagName("a:t")[0]?.textContent || "";

              fullText += text;

              // Check for Bold (b="1") and Italic (i="1")
              if (rPr?.getAttribute("b") === "1") isBold = true;
              if (rPr?.getAttribute("i") === "1") isItalic = true;

              // Font size is in 100ths of a point (e.g., 2400 = 24pt)
              const sz = rPr?.getAttribute("sz");
              if (sz) fontSize = Math.max(fontSize, parseInt(sz) / 100);
            });
            fullText += "\n"; // Preserve paragraph breaks
          });

          return {
            text: fullText.trim(),
            x: emuToPx(off?.getAttribute("x") || "0"),
            y: emuToPx(off?.getAttribute("y") || "0"),
            width: emuToPx(ext?.getAttribute("cx") || "0"),
            height: emuToPx(ext?.getAttribute("cy") || "0"),
            x2:
              emuToPx(off?.getAttribute("x") || "0") +
              emuToPx(ext?.getAttribute("cx") || "0"),
            y2:
              emuToPx(off?.getAttribute("y") || "0") +
              emuToPx(ext?.getAttribute("cy") || "0"),
            rowBucket:
              Math.round(emuToPx(off?.getAttribute("y") || "0") / 10) * 10,
            // New Metadata fields
            metadata: {
              isBold,
              isItalic,
              fontSize: fontSize || 18, // Default PPTX size is often 18pt
            },
          };
        })
        .filter((item) => item.text.length > 0);

      // Sort: PPTX is Top-to-Bottom (y increases downwards)
      // So we use a.rowBucket - b.rowBucket (Ascending)
      items.sort((a, b) =>
        a.rowBucket !== b.rowBucket ? a.rowBucket - b.rowBucket : a.x - b.x,
      );

      // Extract slide number from filename (e.g., slide12.xml -> 12)
      const slideNum = parseInt(path.match(/\d+/)![0]);
      results[index] = { pageNumber: slideNum, items };

      completedSlides++;
      onMessage({
        type: "PROGRESS",
        done: completedSlides,
        total: numSlides,
        percent: Math.round((completedSlides / numSlides) * 100),
      } as WorkerMessage);
    };

    // 3. Parallel execution with concurrency limit
    const MAX_CONCURRENCY = 10; // XML parsing is lighter than PDF rendering
    for (let i = 0; i < slideFiles.length; i += MAX_CONCURRENCY) {
      const batch = slideFiles
        .slice(i, i + MAX_CONCURRENCY)
        .map((path, idx) => processSlide(path, i + idx));
      await Promise.all(batch);
    }

    results.sort((a, b) => a.pageNumber - b.pageNumber);

    const extractor = new MarkdownExtractor();
    const markdown = extractor.extract(results);

    onMessage({ type: "SUCCESS", markdown: markdown } satisfies WorkerMessage);
  } catch (err) {
    onMessage({
      type: "ERROR",
      message: (err as Error).message,
    } as WorkerMessage);
  }
};

const FILE_TYPES = [
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
export function PPTXToText() {
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
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-8 text-center text-4xl text-blue-500">
        PPTX Extractor
      </h1>

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
            <div className="mb-4 flex items-center justify-between text-sm font-bold tracking-widest text-neutral-800 uppercase">
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
              <span className="text-xs font-bold tracking-widest text-neutral-600 uppercase">
                Markdown Output
              </span>
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
          <div className="rounded-lg border-2 border-red-500 bg-red-50 p-4 font-bold tracking-tight text-red-600 uppercase">
            Extraction failed. Please ensure the PPTX is not encrypted.
          </div>
        )}
      </div>
    </div>
  );
}
