import { FileUpload } from "../../common/FileUpload";
import { useLocalJob } from "./local-server/useLocalJob";
import { useLocalServerDiscovery } from "./local-server/localServerContext";
import { LocalServerProvider } from "./local-server/LocalServerProvider";
import { LocalProcessorNotice } from "./LocalProcessorNotice";

export const LocalPDFToImages = () => (
  <LocalServerProvider>
    <LocalPDFToImagesContent />
  </LocalServerProvider>
);

const LocalPDFToImagesContent = () => {
  const { isAvailable, processors } = useLocalServerDiscovery();
  const isEnabled = isAvailable && processors.includes("pdf-to-png-archive");
  const {
    runJob,
    cancelJob,
    status,
    progress,
    pagesCompleted,
    totalPages,
    message,
    artifact,
    error,
  } = useLocalJob("pdf-to-png-archive", "file");
  const isBusy = status === "pending" || status === "processing";

  const download = () => {
    if (!artifact) return;
    const url = URL.createObjectURL(artifact);
    const link = document.createElement("a");
    link.href = url;
    link.download = "document-images.zip";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-3xl font-bold">Local PDF to PNGs</h1>
      <p className="mb-8 text-neutral-600">
        Render a PDF into a compressed ZIP archive of optimized PNG pages.
      </p>
      <LocalProcessorNotice processor="pdf-to-png-archive" />

      {isEnabled && !isBusy && !artifact && (
        <FileUpload
          allowedFileTypes={["application/pdf", ".pdf"]}
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

      {isEnabled && artifact && (
        <div className="mt-6 rounded-xl border-2 border-neutral-200 p-6">
          <h2 className="text-xl font-semibold">Archive ready</h2>
          <p className="mt-2 text-neutral-600">
            Your PNG pages have been packaged into a compressed ZIP archive.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={download}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Download ZIP
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border-2 border-neutral-200 px-4 py-2 text-sm hover:border-neutral-500"
            >
              Process another file
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
