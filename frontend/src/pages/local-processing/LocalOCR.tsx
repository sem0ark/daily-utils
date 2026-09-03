import clsx from "clsx";
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
    downloadJob,
    previewJob,
    status,
    progress,
    pagesCompleted,
    totalPages,
    message,
    pages,
    error,
    history,
  } = useLocalJob("ocr");
  const isBusy = status === "pending" || status === "processing";

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-8 text-center text-3xl font-bold">Local OCR</h1>

      <div className="flex flex-col gap-6">
        <p className="text-neutral-600">
          Send a PDF, image, or ZIP archive of images to your local OCR server.
        </p>
        <LocalProcessorNotice processor="ocr" />

        {isEnabled && (
          <FileUpload
            allowedFileTypes={["image/*", "application/pdf", ".pdf", ".zip"]}
            className={clsx(isBusy && "pointer-events-none opacity-50")}
            onFileUpload={(files) => files[0] && void runJob(files[0])}
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
              onClick={() => {
                if (window.confirm("Are you sure you want to cancel this job?"))
                  void cancelJob();
              }}
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

        {isEnabled && pages.length > 0 && (
          <div className="group animate-in fade-in slide-in-from-bottom-4 relative">
            <div className="flex items-center justify-between rounded-t-lg border-2 border-b-0 border-neutral-500 bg-neutral-100 px-4 py-2">
              <span className="text-sm font-bold">Extracted Text</span>
              <CopyToClipboard getText={() => pages.join("\n\n---\n\n")} />
            </div>
            <pre className="max-h-[60vh] overflow-auto rounded-b-lg border-2 border-neutral-500 bg-neutral-50 p-6 text-sm whitespace-pre-wrap">
              {pages.join("\n\n---\n\n")}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg border-2 border-neutral-500 px-4 py-2 text-sm font-bold hover:border-blue-500"
            >
              Process another file
            </button>
          </div>
        )}

        {isEnabled && history.length > 0 && (
          <div className="rounded-lg border-2 border-neutral-500 bg-neutral-100 p-4">
            <h2 className="mb-3 text-lg font-bold">Previous jobs</h2>
            <div className="flex flex-col gap-2">
              {history.map((job) => (
                <div
                  key={job.job_id}
                  className="flex items-center justify-between gap-4 rounded-md border-2 border-neutral-400 bg-white px-3 py-2 text-left"
                >
                  <div className="min-w-0">
                    <div className="truncate font-bold">{job.file_name}</div>
                    <div className="text-sm text-neutral-600">
                      {new Date(job.created_at).toLocaleString()} · {job.status}
                    </div>
                  </div>
                  {job.status === "completed" && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => void previewJob(job)}
                        className="rounded-md border-2 border-neutral-500 px-3 py-1 text-sm font-bold hover:border-blue-500"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => void downloadJob(job)}
                        className="rounded-md border-2 border-neutral-500 px-3 py-1 text-sm font-bold hover:border-blue-500"
                      >
                        Download
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
