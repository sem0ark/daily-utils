import React, { useState, useMemo, useCallback } from "react";
import {
  usePdfStoreActions,
  usePdfStoreSelectedFiles,
  PDFFile,
} from "./pdfStore";
import { Document, Page } from "react-pdf";
import { useList } from "../../common/useList";

const PDF_PREVIEW_WIDTH = 300;

export const SplitPdfPage: React.FC = () => {
  const selectedFiles = usePdfStoreSelectedFiles();

  const [rangeFiles, { push: pushRangeFile }] = useList<PDFFile>();

  return (
    <>
      <h1 className="mb-8 w-full text-center text-3xl font-bold">
        Split PDF by Ranges
      </h1>

      <div className="my-16 flex flex-col gap-8">
        {rangeFiles.map((file, index) => (
          <PdfSplitRangePreview
            key={`${index}_${file.key}`}
            targetFile={file}
          />
        ))}
      </div>

      <div className="mb-48 flex gap-1 p-1">
        {selectedFiles.length > 0 ? (
          selectedFiles.map((file) => (
            <button
              key={file.key}
              onClick={() => pushRangeFile(file)}
              className="text-md flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-neutral-500 bg-neutral-100 p-2 text-center font-bold text-blue-500 transition-all duration-400 hover:border-neutral-100 hover:text-blue-600"
            >
              New Range for:
              <p>{file.name}</p>
            </button>
          ))
        ) : (
          <p className="text-md flex w-full cursor-not-allowed flex-col items-center justify-center gap-2 rounded-lg border-2 border-neutral-500 bg-neutral-100 p-2 text-center font-bold text-neutral-500 transition-all duration-400">
            Please, select one of the files to split
          </p>
        )}
      </div>
    </>
  );
};

const PdfSplitRangePreview = ({ targetFile }: { targetFile: PDFFile }) => {
  const { addExtractRegionPdfFile } = usePdfStoreActions();

  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [regionStartPage, setRegionStartPage] = useState<number>(1);
  const [regionEndPage, setRegionEndPage] = useState<number>(1);

  const pdfLoader = useMemo(() => {
    if (!targetFile) return null;
    return (
      <Document
        file={targetFile.rawFile}
        onLoadSuccess={({ numPages }) => {
          setNumPages(numPages);
          setPdfLoading(false);
          setPdfError(null);
        }}
        onLoadError={(error) => {
          console.error("Error loading PDF: ", error);
          setPdfError("Failed to load PDF for preview. " + error.message);
          setPdfLoading(false);
        }}
        className="hidden"
      >
      </Document>
    );
  }, [targetFile]);

  const addRangeToToolbar = useCallback(() => {
    addExtractRegionPdfFile(targetFile, regionStartPage, regionEndPage);
  }, [targetFile, regionStartPage, regionEndPage, addExtractRegionPdfFile]);

  return (
    <>
      {pdfLoader}
      <div className="m-auto grid w-xl grid-cols-2 flex-col justify-center gap-2">
        <h3 className="mb-2 w-full text-center text-lg font-semibold">Start Page Preview</h3>
        <h3 className="mb-2 w-full text-center text-lg font-semibold">End Page Preview</h3>

        <div className="flex flex-col items-center">
          <div
            className="relative flex h-fit items-center justify-center overflow-hidden rounded-md border-2 border-neutral-300 bg-white p-2"
            style={{width: `${PDF_PREVIEW_WIDTH}px`}}
          >
            {pdfLoading && <p className="text-neutral-500">Loading PDF...</p>}
            {pdfError && <p className="text-red-500">{pdfError}</p>}
            {!pdfLoading && !pdfError && (
              <Document file={targetFile.rawFile}>
                <Page
                  pageNumber={regionStartPage ?? 1}
                  width={PDF_PREVIEW_WIDTH}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
              </Document>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div
            className="relative flex items-center justify-center overflow-hidden rounded-md border-2 border-neutral-300 bg-white p-2"
            style={{
              height: `${PDF_PREVIEW_WIDTH * 1.4}px`,
              width: `${PDF_PREVIEW_WIDTH}px`,
            }}
          >
            {pdfLoading && <p className="text-neutral-500">Loading PDF...</p>}
            {pdfError && <p className="text-red-500">{pdfError}</p>}
            {!pdfLoading && !pdfError && (
              <Document file={targetFile.rawFile}>
                <Page
                  pageNumber={regionEndPage ?? 1}
                  width={PDF_PREVIEW_WIDTH}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
              </Document>
            )}
          </div>
        </div>

        {numPages && (
          <p className="mt-2 w-full text-center text-neutral-600">
            {regionStartPage} of {numPages}
          </p>
        )}
        {numPages && (
          <p className="mt-2 w-full text-center text-neutral-600">
            {regionEndPage} of {numPages}
          </p>
        )}

        <input
          type="number"
          placeholder="Start"
          value={regionStartPage ?? 1}
          onChange={(e) => {
            const newStart = Math.min(
              Number.parseInt(e.target.value),
              numPages ?? 1,
            );
            const newEnd = Math.min(
              Math.max(newStart, regionEndPage),
              numPages ?? 1,
            );
            setRegionStartPage(newStart);
            setRegionEndPage(newEnd);
          }}
          min="1"
          max={numPages || undefined}
          className="block w-full rounded-md border border-neutral-300 p-2 text-center focus:border-blue-500 focus:ring-blue-500"
        />
        <input
          type="number"
          placeholder="End"
          value={regionEndPage ?? numPages ?? 1}
          onChange={(e) => {
            const newEnd = Math.min(
              Number.parseInt(e.target.value),
              numPages ?? 1,
            );
            const newStart = Math.min(newEnd, regionStartPage, numPages ?? 1);
            setRegionStartPage(newStart);
            setRegionEndPage(newEnd);
          }}
          min="1"
          max={numPages || undefined}
          className="block w-full rounded-md border border-neutral-300 p-2 text-center focus:border-blue-500 focus:ring-blue-500"
        />

        <button
          onClick={addRangeToToolbar}
          className="col-span-2 flex w-full items-center justify-center rounded-lg border-2 border-neutral-500 bg-neutral-100 p-2 text-center text-xl font-bold text-blue-500 transition-all duration-400 hover:gap-4 hover:border-neutral-100 hover:text-blue-600"
        >
          Add to Tollbar
        </button>
      </div>
    </>
  );
};
