import type { JobStatusResponse } from "./types";

export const LocalJobList = ({
  jobs,
  onCancel,
  onDownload,
  onPreview,
}: {
  jobs: JobStatusResponse[];
  onCancel: (job: JobStatusResponse) => void;
  onDownload: (job: JobStatusResponse) => void;
  onPreview?: (job: JobStatusResponse) => void;
}) => (
  <div className="rounded-lg border-2 border-neutral-500 bg-neutral-100 p-4">
    <h2 className="mb-3 text-lg font-bold">Jobs</h2>
    <div className="flex flex-col gap-2">
      {jobs.map((job) => (
        <div
          key={job.job_id}
          className="flex items-center justify-between gap-4 rounded-md border-2 border-neutral-400 bg-white px-3 py-2 text-left"
        >
          <div className="min-w-0">
            <div className="truncate font-bold">{job.file_name}</div>
            <div className="text-sm text-neutral-600">
              {new Date(job.created_at).toLocaleString()} · {job.status}
            </div>
            {job.status !== "completed" && job.status !== "failed" && (
              <div className="mt-2 h-2 overflow-hidden rounded-sm border border-neutral-400 bg-neutral-100">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            )}
            {job.error && (
              <div className="mt-1 text-sm font-bold text-red-600">
                {job.error}
              </div>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            {job.status !== "completed" && job.status !== "failed" && (
              <button
                onClick={() => onCancel(job)}
                className="rounded-md border-2 border-neutral-500 px-3 py-1 text-sm font-bold hover:border-red-500"
              >
                Cancel
              </button>
            )}
            {job.status === "completed" && (
              <div className="flex shrink-0 gap-2">
                {onPreview && (
                  <button
                    onClick={() => onPreview(job)}
                    className="rounded-md border-2 border-neutral-500 px-3 py-1 text-sm font-bold hover:border-blue-500"
                  >
                    Preview
                  </button>
                )}
                <button
                  onClick={() => onDownload(job)}
                  className="rounded-md border-2 border-neutral-500 px-3 py-1 text-sm font-bold hover:border-blue-500"
                >
                  Download
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);
