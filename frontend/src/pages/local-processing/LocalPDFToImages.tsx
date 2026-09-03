import { useState } from "react";
import clsx from "clsx";
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
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
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
    const sourceBaseName = sourceFileName?.replace(/\.pdf$/i, "") || "document";
    link.download = `${sourceBaseName}-images.zip`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-8 text-center text-3xl font-bold">Local PDF to PNGs</h1>

      <div className="flex flex-col gap-6">
        <p className="text-neutral-600">
          Render a PDF into a compressed ZIP archive of optimized PNG pages.
        </p>
        <LocalProcessorNotice processor="pdf-to-png-archive" />

        {isEnabled && (
          <FileUpload
            allowedFileTypes={["application/pdf", ".pdf"]}
            className={clsx(isBusy && "pointer-events-none opacity-50")}
            onFileUpload={(files) => {
              const file = files[0];
              if (!file) return;
              setSourceFileName(file.name);
              void runJob(file);
            }}
          />
        )}

        {isEnabled && isBusy && (
          <div className="rounded-lg border-2 border-neutral-500 bg-neutral-100 p-6">
            <div className="mb-4 flex items-center justify-between text-sm font-bold">
              <span>{message || "Processing..."}</span>
              <span className="text-blue-500">
                {totalPages > 0
                  ? `${pagesCompleted} / ${totalPages} Pages`
                  : `${progress}%`}
              </span>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-sm border-2 border-neutral-500 bg-white">
              <div
                className="h-full bg-blue-500 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <button
              onClick={() => void cancelJob()}
              className="mt-5 rounded-lg border-2 border-neutral-500 px-4 py-2 text-sm font-bold hover:border-blue-500"
            >
              Cancel
            </button>
          </div>
        )}

        {isEnabled && error && (
          <div className="rounded-lg border-2 border-red-500 bg-red-50 p-4 font-bold text-red-600">
            {error}
          </div>
        )}

        {isEnabled && artifact && (
          <div className="group animate-in fade-in slide-in-from-bottom-4 relative rounded-lg border-2 border-neutral-500 bg-neutral-100 p-6">
            <h2 className="text-xl font-bold">Archive ready</h2>
            <p className="mt-2 text-neutral-600">
              Your PNG pages have been packaged into a compressed ZIP archive.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={download}
                className="rounded-lg border-2 border-blue-600 bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                Download ZIP
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg border-2 border-neutral-500 px-4 py-2 text-sm font-bold hover:border-blue-500"
              >
                Process another file
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
