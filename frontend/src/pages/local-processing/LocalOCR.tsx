import { useLocalJob } from "./local-server/useLocalJob";
import { FileUpload } from "../../common/FileUpload";
import { CopyToClipboard } from "../../common/components/buttons";
import { LocalProcessorNotice } from "./LocalProcessorNotice";
import { useLocalServerDiscovery } from "./local-server/localServerContext";
import { LocalServerProvider } from "./local-server/LocalServerProvider";

export const LocalOCR = () => (
  <LocalServerProvider>
    <LocalOCRContent />
  </LocalServerProvider>
);

const LocalOCRContent = () => {
  const { isAvailable, processors } = useLocalServerDiscovery();
  const isEnabled = isAvailable && processors.includes("ocr");
  const {
    runJob,
    cancelJob,
    status,
    progress,
    pagesCompleted,
    totalPages,
    message,
    pages,
    error,
  } = useLocalJob("ocr");
  const isBusy = status === "pending" || status === "processing";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-3xl font-bold">Local OCR</h1>
      <p className="mb-8 text-neutral-600">
        Send a PDF, image, or ZIP archive of images to your local OCR server.
      </p>
      <LocalProcessorNotice processor="ocr" />

      {isEnabled && !isBusy && pages.length === 0 && (
        <FileUpload
          allowedFileTypes={["image/*", "application/pdf", ".pdf", ".zip"]}
          onFileUpload={(files) => files[0] && void runJob(files[0])}
        />
      )}

      {isEnabled && isBusy && (
        <div className="rounded-xl border-2 border-neutral-200 p-6">
          <div className="mb-3 flex justify-between text-sm">
            <span>{message || "Processing..."}</span>
            <span>
              {progress}%
              {totalPages > 0 && ` (${pagesCompleted}/${totalPages} pages)`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <button
            onClick={() => void cancelJob()}
            className="mt-5 rounded-lg border-2 border-neutral-200 px-4 py-2 text-sm hover:border-neutral-500"
          >
            Cancel
          </button>
        </div>
      )}

      {isEnabled && error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {isEnabled && pages.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Extracted text</h2>
            <CopyToClipboard getText={() => pages.join("\n\n---\n\n")} />
          </div>
          <pre className="max-h-[60vh] overflow-auto rounded-xl bg-neutral-100 p-5 text-sm whitespace-pre-wrap">
            {pages.join("\n\n---\n\n")}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg border-2 border-neutral-200 px-4 py-2 text-sm hover:border-neutral-500"
          >
            Process another file
          </button>
        </div>
      )}
    </div>
  );
};
