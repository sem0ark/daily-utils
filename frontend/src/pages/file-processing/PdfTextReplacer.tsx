import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy, TextItem } from "pdfjs-dist/types/src/display/api";
import type { PageViewport } from "pdfjs-dist/types/src/display/display_utils";
import * as pdfjsLib from "pdfjs-dist";
import mupdf, { PDFDocument as MuPDFDocument, PDFPage as MuPDFPage } from "mupdf";
import { FileUpload } from "../../common/FileUpload";
import { findTextMatches, type SearchTextItem, type SearchTextMatch } from "./pdfTextSearch";
import { getColorState, restoreColorState as restorePdfColorState, type ColorState } from "./pdfColorState";
import { replacePdfText } from "./pdfContentErasure";

import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const FILE_TYPES = ["application/pdf"];
const PAGE_BATCH_SIZE = 5;

type MuPDFObject = ReturnType<MuPDFPage["getObject"]>;
type PdfStreamVisitor = (streamReference: MuPDFObject, resources: MuPDFObject) => boolean;

type ReplacementFont = {
  reference: ReturnType<MuPDFDocument["addSimpleFont"]>;
  resourceName: string;
};

/** Chooses a standard PDF font that preserves the source font's emphasis. */
const getReplacementFont = (fontName: string) => {
  const lowerCaseFontName = fontName.toLowerCase();

  if (lowerCaseFontName.includes("bold") && lowerCaseFontName.includes("italic")) {
    return "Helvetica-BoldOblique";
  }
  if (lowerCaseFontName.includes("bold")) return "Helvetica-Bold";
  if (lowerCaseFontName.includes("italic") || lowerCaseFontName.includes("oblique")) {
    return "Helvetica-Oblique";
  }
  return "Helvetica";
};

const formatPdfNumber = (value: number) => {
  if (Math.abs(value) < 0.000001) return "0";
  return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
};

const encodePdfText = (value: string) =>
  Array.from(value)
    .map((character) => {
      const codePoint = character.codePointAt(0) ?? 63;
      return (codePoint <= 255 ? codePoint : 63).toString(16).padStart(2, "0");
    })
    .join("");

const decodePdfStream = (streamReference: MuPDFObject) =>
  new TextDecoder().decode(streamReference.readStream().asUint8Array());

const getPageContentReferences = (pageObject: MuPDFObject) => {
  const contents = pageObject.get("Contents").resolve();
  return contents.isArray()
    ? Array.from({ length: contents.length }, (_, index) => contents.get(index))
    : [pageObject.get("Contents")];
};

const getStreamResources = (stream: MuPDFObject, inheritedResources: MuPDFObject) => {
  const localResourcesObject = stream.get("Resources");
  const localResources = localResourcesObject.isNull() ? localResourcesObject : localResourcesObject.resolve();
  return localResources.isDictionary() ? localResources : inheritedResources;
};

const visitPdfStream = (
  streamReference: MuPDFObject,
  inheritedResources: MuPDFObject,
  visitedObjects: Set<number>,
  visitor: PdfStreamVisitor,
) => {
  const stream = streamReference.resolve();
  if (!stream.isDictionary() || stream.get("Subtype").asName?.() === "Image") return false;

  const resources = getStreamResources(stream, inheritedResources);
  const objectNumber = streamReference.asIndirect();
  if (visitedObjects.has(objectNumber)) return false;
  visitedObjects.add(objectNumber);

  let didChange = visitor(streamReference, resources);
  const xObjectsObject = resources.get("XObject");
  if (xObjectsObject.isNull()) return didChange;
  const xObjects = xObjectsObject.resolve();
  if (!xObjects.isDictionary()) return didChange;

  xObjects.forEach((reference) => {
    didChange = visitPdfStream(reference, resources, visitedObjects, visitor) || didChange;
  });
  return didChange;
};

const visitPageStreams = (pageObject: MuPDFObject, visitor: PdfStreamVisitor) => {
  const pageResources = pageObject.get("Resources").resolve();
  const visitedObjects = new Set<number>();
  let didChange = false;

  for (const streamReference of getPageContentReferences(pageObject)) {
    didChange = visitPdfStream(streamReference, pageResources, visitedObjects, visitor) || didChange;
  }

  const pageXObjectsObject = pageResources.get("XObject");
  if (pageXObjectsObject.isNull()) return didChange;
  const pageXObjects = pageXObjectsObject.resolve();
  if (!pageXObjects.isDictionary()) return didChange;

  pageXObjects.forEach((reference) => {
    didChange = visitPdfStream(reference, pageResources, visitedObjects, visitor) || didChange;
  });
  return didChange;
};

const getOriginalColorState = (originalContent: string[]) => {
  const originalColorState = new Map<string, ColorState>();
  for (const content of originalContent) {
    for (const [name, state] of getColorState(content)) originalColorState.set(name, state);
  }
  return originalColorState;
};

const restoreColorStateInPage = (pageObject: MuPDFObject, originalContent: string[]) => {
  const originalColorState = getOriginalColorState(originalContent);
  visitPageStreams(pageObject, (streamReference) => {
    const source = decodePdfStream(streamReference);
    const restored = restorePdfColorState(source, originalColorState);
    if (restored === source) return false;
    streamReference.writeStream(new TextEncoder().encode(restored));
    return true;
  });
};

const replaceTextInPage = (pageObject: MuPDFObject, searchTerm: string, replacement: string) =>
  visitPageStreams(pageObject, (streamReference) => {
    const source = decodePdfStream(streamReference);
    const replaced = replacePdfText(source, searchTerm, replacement);
    if (replaced === source) return false;
    streamReference.writeStream(new TextEncoder().encode(replaced));
    return true;
  });

/** Groups selected matches by page so each PDF page is opened only once. */
const groupMatchesByPage = (selectedMatches: SearchTextMatch[]) => {
  const matchesByPage = new Map<number, SearchTextMatch[]>();

  for (const match of selectedMatches) {
    const pageMatches = matchesByPage.get(match.pageIndex) ?? [];
    pageMatches.push(match);
    matchesByPage.set(match.pageIndex, pageMatches);
  }

  return matchesByPage;
};

/** Reads only searchable text fields from one PDF.js page. */
const getPageSearchItems = async (page: PDFPageProxy): Promise<SearchTextItem[]> => {
  const content = await page.getTextContent();
  return content.items
    .filter((item): item is TextItem => "str" in item && item.str.length > 0)
    .map((item) => ({
      str: item.str,
      transform: item.transform as SearchTextItem["transform"],
      width: item.width,
      height: item.height,
      fontName: item.fontName,
    }));
};

/** Searches every page and returns matches in document order. */
const searchPdfDocument = async (document: PDFDocumentProxy, searchTerm: string): Promise<SearchTextMatch[]> => {
  const matches: SearchTextMatch[] = [];

  for (let pageIndex = 0; pageIndex < document.numPages; pageIndex++) {
    const page = await document.getPage(pageIndex + 1);
    try {
      const searchItems = await getPageSearchItems(page);
      matches.push(...findTextMatches(searchItems, searchTerm, pageIndex));
    } finally {
      page.cleanup();
    }
  }

  return matches;
};

/** Removes selected text from a PDF while preserving the page geometry. */
const replaceSelectedPdfText = (
  pdfBytes: Uint8Array,
  searchTerm: string,
  selectedMatches: SearchTextMatch[],
  replacement: string,
): Uint8Array => {
  const document = mupdf.Document.openDocument(pdfBytes, "application/pdf") as MuPDFDocument;
  const matchesByPage = groupMatchesByPage(selectedMatches);
  const replacementFonts = new Map<string, ReplacementFont>();

  try {
    for (const [pageIndex, pageMatches] of matchesByPage) {
      const page = document.loadPage(pageIndex) as MuPDFPage;
      const pageObject = page.getObject();
      const originalResources = pageObject.get("Resources").resolve();
      const originalColorSpacesObject = originalResources.get("ColorSpace");
      const originalColorSpaces = originalColorSpacesObject.isNull()
        ? document.newDictionary()
        : originalColorSpacesObject.resolve();
      const originalContent = getPageContentReferences(pageObject).map((reference) => {
        const stream = reference.resolve();
        return stream.isDictionary() ? decodePdfStream(reference) : "";
      });
      try {
        const replacedInContent = replaceTextInPage(pageObject, searchTerm, replacement);
        pageObject.get("Resources").resolve().put("ColorSpace", originalColorSpaces);
        restoreColorStateInPage(pageObject, originalContent);
        if (!replacedInContent) appendReplacementText(page, document, pageMatches, replacement, replacementFonts);
      } finally {
        page.destroy();
      }
    }

    return document.saveToBuffer("garbage=0").asUint8Array().slice();
  } finally {
    document.destroy();
  }
};

/** Appends replacement text without rewriting the original PDF resources. */
const appendReplacementText = (
  page: MuPDFPage,
  document: MuPDFDocument,
  matches: SearchTextMatch[],
  replacement: string,
  replacementFonts: Map<string, ReplacementFont>,
) => {
  const pageObject = page.getObject();
  const resources = pageObject.get("Resources").resolve();
  const fontResourcesObject = resources.get("Font");
  const fontResources = fontResourcesObject.isNull()
    ? resources.put("Font", document.newDictionary())
    : fontResourcesObject.resolve();
  const contentLines = ["q"];

  for (const match of matches) {
    const fontName = getReplacementFont(match.fontName);
    let font = replacementFonts.get(fontName);
    if (!font) {
      const baseFont = new mupdf.Font(fontName);
      font = {
        reference: document.addSimpleFont(baseFont, "Latin"),
        resourceName: `ReplacementFont${replacementFonts.size}`,
      };
      replacementFonts.set(fontName, font);
    }
    fontResources.put(font.resourceName, font.reference);

    const radians = (match.rotation * Math.PI) / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    const encodedText = encodePdfText(replacement);
    contentLines.push(
      `BT /${font.resourceName} ${formatPdfNumber(match.fontSize)} Tf ${formatPdfNumber(cosine)} ${formatPdfNumber(sine)} ${formatPdfNumber(-sine)} ${formatPdfNumber(cosine)} ${formatPdfNumber(match.x)} ${formatPdfNumber(match.y)} Tm <${encodedText}> Tj ET`,
    );
  }

  contentLines.push("Q");
  const contentReference = document.addStream(new TextEncoder().encode(contentLines.join("\n")), {});
  const contents = pageObject.get("Contents");
  const resolvedContents = contents.resolve();
  if (resolvedContents.isArray()) resolvedContents.push(contentReference);
  else pageObject.put("Contents", [contents, contentReference]);
};

interface PagePreviewProps {
  document: PDFDocumentProxy;
  pageNumber: number;
  matches: SearchTextMatch[];
  activeMatchId: string | null;
  onSelectMatch: (id: string) => void;
}

const PagePreview = ({ document, pageNumber, matches, activeMatchId, onSelectMatch }: PagePreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState<PageViewport | null>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | undefined;

    const renderPage = async () => {
      setIsRendering(true);
      const page = await document.getPage(pageNumber);
      const nextViewport = page.getViewport({ scale: 1.25 });
      if (cancelled || !canvasRef.current) return;

      setViewport(nextViewport);
      const canvas = canvasRef.current;
      canvas.width = nextViewport.width;
      canvas.height = nextViewport.height;
      if (!canvas.getContext("2d")) return;
      renderTask = page.render({ canvas, viewport: nextViewport });
      await renderTask.promise;
      page.cleanup();
      if (!cancelled) setIsRendering(false);
    };

    void renderPage().catch(() => {
      if (!cancelled) setIsRendering(false);
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [document, pageNumber]);

  return (
    <div
      className="relative mx-auto border-2 border-neutral-200 bg-white"
      style={{
        width: viewport?.width ?? "100%",
        minHeight: viewport?.height ?? 420,
      }}
    >
      <canvas ref={canvasRef} className="block max-w-full" />
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-white text-sm font-bold text-neutral-500">
          Rendering page {pageNumber}...
        </div>
      )}
      {viewport &&
        matches.map((match) => {
          const [left, baseline] = viewport.convertToViewportPoint(match.x, match.y);
          const scale = viewport.scale;
          const active = match.id === activeMatchId;
          return (
            <button
              key={match.id}
              type="button"
              title={`Replace “${match.text}”`}
              onClick={() => onSelectMatch(match.id)}
              className={`absolute border text-left ${
                active
                  ? "z-10 border-blue-600 bg-blue-300/50 ring-2 ring-blue-500"
                  : match.selected
                    ? "border-blue-400 bg-blue-200/30"
                    : "border-neutral-400 bg-neutral-200/30"
              }`}
              style={{
                left,
                top: baseline - match.height * scale,
                width: Math.max(match.width * scale, 8),
                height: Math.max(match.height * scale, 8),
                transform: `rotate(${-match.rotation}deg)`,
                transformOrigin: "left bottom",
              }}
            />
          );
        })}
      <span className="absolute right-2 bottom-2 bg-neutral-800 px-2 py-1 text-xs text-white">Page {pageNumber}</span>
    </div>
  );
};

export function PdfTextReplacer() {
  const [fileName, setFileName] = useState("");
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [visiblePages, setVisiblePages] = useState(PAGE_BATCH_SIZE);
  const [searchTerm, setSearchTerm] = useState("");
  const [replacement, setReplacement] = useState("");
  const [matches, setMatches] = useState<SearchTextMatch[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const previewRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(
    () => () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    },
    [downloadUrl],
  );

  const loadPdf = async (bytes: Uint8Array) => {
    const loaded = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
    setPdfDocument(loaded);
    setTotalPages(loaded.numPages);
    setVisiblePages(Math.min(PAGE_BATCH_SIZE, loaded.numPages));
  };

  const handleFileUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setError("");
    setMatches([]);
    setActiveMatchIndex(-1);
    setDownloadUrl(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      await loadPdf(bytes);
      setPdfBytes(bytes);
      setFileName(file.name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this PDF.");
    }
  };

  const searchPdf = async () => {
    if (!pdfDocument || !searchTerm.trim()) return;
    setIsSearching(true);
    setError("");

    try {
      const foundMatches = await searchPdfDocument(pdfDocument, searchTerm);
      setMatches(foundMatches);
      setActiveMatchIndex(foundMatches.length ? 0 : -1);
      if (!foundMatches.length) setError("No matching text was found.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const active = matches[activeMatchIndex];
    if (!active) return;
    if (active.pageIndex >= visiblePages) {
      setVisiblePages(Math.min(active.pageIndex + 1, totalPages));
    }
    window.setTimeout(() => {
      previewRefs.current[active.pageIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  }, [activeMatchIndex, matches, totalPages, visiblePages]);

  const convertPdf = async () => {
    if (!pdfBytes || !replacement.trim()) return;
    const selectedMatches = matches.filter((match) => match.selected);
    if (!selectedMatches.length) return;
    setIsConverting(true);
    setError("");

    try {
      const finalBytes = replaceSelectedPdfText(pdfBytes, searchTerm, selectedMatches, replacement);
      setPdfBytes(finalBytes);
      await loadPdf(finalBytes);
      setMatches([]);
      setActiveMatchIndex(-1);
      const nextUrl = URL.createObjectURL(new Blob([finalBytes], { type: "application/pdf" }));
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(nextUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Conversion failed.");
    } finally {
      setIsConverting(false);
    }
  };

  const reset = () => {
    setFileName("");
    setPdfBytes(null);
    setPdfDocument(null);
    setTotalPages(0);
    setVisiblePages(PAGE_BATCH_SIZE);
    setMatches([]);
    setActiveMatchIndex(-1);
    setSearchTerm("");
    setReplacement("");
    setError("");
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-8 text-center text-3xl font-bold">Replace PDF text</h1>
      {!pdfDocument ? (
        <div className="flex flex-col gap-4">
          <FileUpload onFileUpload={handleFileUpload} allowedFileTypes={FILE_TYPES} />
          <p className="text-center text-sm text-neutral-500">Search, select, and replace text locally in a PDF.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <aside className="flex min-w-0 flex-col gap-4 rounded-lg border-2 border-neutral-500 bg-neutral-50 p-4">
            <div className="flex items-center justify-between gap-3 border-b-2 border-neutral-200 pb-3">
              <span className="truncate text-sm font-bold" title={fileName}>
                {fileName}
              </span>
              <button
                type="button"
                onClick={reset}
                className="rounded-md border-2 border-neutral-500 px-2 py-1 text-xs font-bold hover:border-blue-500"
              >
                Reset
              </button>
            </div>
            <label className="text-sm font-bold">
              Find text
              <div className="mt-1 flex gap-2">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && void searchPdf()}
                  className="min-w-0 flex-1 rounded-lg border-2 border-neutral-200 bg-white p-2 outline-none focus:border-neutral-500"
                />
                <button
                  type="button"
                  onClick={() => void searchPdf()}
                  disabled={isSearching || !searchTerm.trim()}
                  className="rounded-md border-2 border-neutral-500 px-3 text-sm font-bold hover:border-blue-500 disabled:opacity-50"
                >
                  {isSearching ? "..." : "Find"}
                </button>
              </div>
            </label>
            <label className="text-sm font-bold">
              Replace with
              <input
                value={replacement}
                onChange={(event) => setReplacement(event.target.value)}
                className="mt-1 w-full rounded-lg border-2 border-neutral-200 bg-white p-2 outline-none focus:border-neutral-500"
              />
            </label>
            {matches.length > 0 && (
              <div className="flex flex-col gap-3 border-t-2 border-neutral-200 pt-3">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span>
                    {activeMatchIndex + 1} / {matches.length}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label="Previous match"
                      onClick={() => setActiveMatchIndex((index) => (index <= 0 ? matches.length - 1 : index - 1))}
                      className="rounded border border-neutral-500 px-2 py-1"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      aria-label="Next match"
                      onClick={() => setActiveMatchIndex((index) => (index + 1) % matches.length)}
                      className="rounded border border-neutral-500 px-2 py-1"
                    >
                      Next
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setMatches((items) => items.map((item) => ({ ...item, selected: true })))}
                    className="flex-1 rounded border border-neutral-300 bg-white py-1"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatches((items) => items.map((item) => ({ ...item, selected: false })))}
                    className="flex-1 rounded border border-neutral-300 bg-white py-1"
                  >
                    Select none
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto border border-neutral-200 bg-white">
                  {matches.map((match, index) => (
                    <div
                      key={match.id}
                      className={`flex cursor-pointer items-center gap-2 p-2 text-xs ${index === activeMatchIndex ? "border-l-4 border-blue-500 bg-blue-50" : "hover:bg-neutral-50"}`}
                      onClick={() => setActiveMatchIndex(index)}
                    >
                      <input
                        type="checkbox"
                        checked={match.selected}
                        onChange={() =>
                          setMatches((items) =>
                            items.map((item) => (item.id === match.id ? { ...item, selected: !item.selected } : item)),
                          )
                        }
                        onClick={(event) => event.stopPropagation()}
                      />
                      <span className="text-neutral-500">Page {match.pageIndex + 1}</span>
                      <span className="truncate">{match.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {error && <p className="border-2 border-red-500 bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p>}
            <button
              type="button"
              onClick={() => void convertPdf()}
              disabled={isConverting || !matches.some((match) => match.selected) || !replacement.trim()}
              className="mt-auto rounded-md bg-blue-500 px-3 py-2 text-sm font-bold text-white hover:bg-blue-600 disabled:pointer-events-none disabled:opacity-50"
            >
              {isConverting ? "Converting..." : "Convert selected text"}
            </button>
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={`replaced-${fileName}`}
                className="rounded-md border-2 border-blue-500 px-3 py-2 text-center text-sm font-bold text-blue-500 hover:bg-blue-50"
              >
                Download modified PDF
              </a>
            )}
          </aside>
          <section
            className="max-h-[80vh] space-y-4 overflow-y-auto rounded-lg border-2 border-neutral-500 bg-neutral-100 p-4 md:col-span-2"
            aria-label="PDF preview"
          >
            {Array.from({ length: Math.min(visiblePages, totalPages) }, (_, index) => (
              <div
                key={index}
                ref={(element) => {
                  previewRefs.current[index] = element;
                }}
              >
                <PagePreview
                  document={pdfDocument}
                  pageNumber={index + 1}
                  matches={matches.filter((match) => match.pageIndex === index)}
                  activeMatchId={matches[activeMatchIndex]?.id ?? null}
                  onSelectMatch={(id) => setActiveMatchIndex(matches.findIndex((match) => match.id === id))}
                />
              </div>
            ))}
            {visiblePages < totalPages && (
              <button
                type="button"
                onClick={() => setVisiblePages((count) => Math.min(count + PAGE_BATCH_SIZE, totalPages))}
                className="mx-auto block rounded-md border-2 border-neutral-500 bg-white px-4 py-2 text-sm font-bold hover:border-blue-500"
              >
                Load more pages ({visiblePages} of {totalPages})
              </button>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
