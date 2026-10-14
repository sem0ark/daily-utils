import { useLocalJob } from "./local-server/useLocalJob";
import { FileUpload } from "../../common/FileUpload";
import { LocalProcessorNotice } from "./LocalProcessorNotice";
import { useLocalServerDiscovery } from "./local-server/localServerContext";
import { LocalServerProvider } from "./local-server/LocalServerProvider";
import { LocalJobList } from "./local-server/LocalJobList";

export const LocalOCR = () => (
  <LocalServerProvider>
    <LocalOCRContent />
  </LocalServerProvider>
);

const LocalOCRContent = () => {
  const { isAvailable, processors } = useLocalServerDiscovery();
  const isEnabled = isAvailable && processors.includes("ocr");
  const { runJob, cancelJob, downloadJob, previewJob, history } =
    useLocalJob("ocr");
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
            onFileUpload={(files) => {
              for (const file of files) void runJob(file);
            }}
          />
        )}

        {isEnabled && history.length > 0 && (
          <LocalJobList
            jobs={history}
            onCancel={(job) => {
              if (window.confirm("Are you sure you want to cancel this job?"))
                void cancelJob(job.job_id);
            }}
            onDownload={(job) => void downloadJob(job)}
            onPreview={(job) => void previewJob(job)}
          />
        )}
      </div>
    </div>
  );
};
