import { FileUpload } from "../../common/FileUpload";
import { useLocalJob } from "./local-server/useLocalJob";
import { useLocalServerDiscovery } from "./local-server/localServerContext";
import { LocalServerProvider } from "./local-server/LocalServerProvider";
import { LocalProcessorNotice } from "./LocalProcessorNotice";
import { LocalJobList } from "./local-server/LocalJobList";

export const LocalPDFToImages = () => (
  <LocalServerProvider>
    <LocalPDFToImagesContent />
  </LocalServerProvider>
);

const LocalPDFToImagesContent = () => {
  const { isAvailable, processors } = useLocalServerDiscovery();
  const isEnabled = isAvailable && processors.includes("pdf-to-png-archive");
  const { runJob, cancelJob, history, downloadJob } = useLocalJob(
    "pdf-to-png-archive",
    "file",
  );

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
          />
        )}
      </div>
    </div>
  );
};
