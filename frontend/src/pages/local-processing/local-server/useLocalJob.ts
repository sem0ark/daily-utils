import { useCallback, useEffect, useRef, useState } from "react";
import { localApi } from "./api";
import type { JobStatus, JobStatusResponse } from "./types";

export function useLocalJob(
  processor: string,
  resultMode: "pages" | "file" = "pages",
) {
  const [status, setStatus] = useState<JobStatus | "idle">("idle");
  const [progress, setProgress] = useState(0);
  const [pagesCompleted, setPagesCompleted] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [message, setMessage] = useState("");
  const [pages, setPages] = useState<string[]>([]);
  const [artifact, setArtifact] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<JobStatusResponse[]>([]);
  const jobId = useRef<string | null>(null);
  const timers = useRef(new Map<string, number>());

  const refreshHistory = useCallback(async () => {
    try {
      setHistory(await localApi.listJobs(processor));
    } catch {
      // Local server may be unavailable while the page is open.
    }
  }, [processor]);

  const clearPolling = useCallback(() => {
    for (const timer of timers.current.values()) window.clearTimeout(timer);
    timers.current.clear();
  }, []);

  const runJob = useCallback(
    async (file: File) => {
      jobId.current = null;
      setStatus("pending");
      setProgress(0);
      setPagesCompleted(0);
      setTotalPages(0);
      setMessage("Uploading file...");
      setPages([]);
      setArtifact(null);
      setError(null);

      try {
        const id = await localApi.submitJob(file, processor);
        jobId.current = id;
        refreshHistory();

        const poll = async () => {
          const state = await localApi.pollJob(id);
          refreshHistory();
          setStatus(state.status);
          setProgress(state.progress);
          setPagesCompleted(state.pages_completed);
          setTotalPages(state.total_pages);
          setMessage(state.message);

          if (state.status === "completed") {
            if (resultMode === "file") {
              setArtifact(await localApi.getArtifact(id));
            } else {
              setPages(await localApi.getResult(id));
            }
            return;
          }
          if (state.status === "failed") {
            setError(state.error || state.message);
            return;
          }
          timers.current.set(
            id,
            window.setTimeout(() => void poll(), 1000),
          );
        };
        await poll();
      } catch (caught) {
        setStatus("failed");
        setError(caught instanceof Error ? caught.message : "Local job failed");
        refreshHistory();
      }
    },
    [clearPolling, processor, refreshHistory, resultMode],
  );

  const cancelJob = useCallback(
    async (requestedJobId?: string) => {
      const cancelledJobId = requestedJobId || jobId.current;
      if (cancelledJobId) {
        const timer = timers.current.get(cancelledJobId);
        if (timer !== undefined) window.clearTimeout(timer);
        timers.current.delete(cancelledJobId);
        try {
          await localApi.cancelJob(cancelledJobId);
        } catch {
          // The job may have completed between polling and cancellation.
        }
      }
      jobId.current = null;
      setStatus("idle");
      setMessage("");
      await refreshHistory();
    },
    [refreshHistory],
  );

  const downloadJob = useCallback(
    async (job: JobStatusResponse) => {
      if (job.status !== "completed") return;
      const blob =
        resultMode === "file"
          ? await localApi.getArtifact(job.job_id)
          : new Blob(
              [(await localApi.getResult(job.job_id)).join("\n\n---\n\n")],
              {
                type: "text/plain;charset=utf-8",
              },
            );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileName = job.file_name.replace(/\.[^/.]+$/, "") || "result";
      link.href = url;
      link.download =
        resultMode === "file" ? `${fileName}-images.zip` : `${fileName}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    },
    [resultMode],
  );

  const previewJob = useCallback(async (job: JobStatusResponse) => {
    if (job.status !== "completed") return;
    const previewWindow = window.open("about:blank", "_blank");
    if (!previewWindow) return;

    try {
      const result = await localApi.getResult(job.job_id);
      const blob = new Blob([result.join("\n\n---\n\n")], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      previewWindow.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      previewWindow.document.body.textContent = "Could not load OCR output.";
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;
    let historyTimer: number | null = null;

    const poll = async () => {
      try {
        const jobs = await localApi.listJobs(processor);
        if (isCancelled) return;
        setHistory(jobs);
        if (
          jobs.some(
            (job) => job.status !== "completed" && job.status !== "failed",
          )
        ) {
          historyTimer = window.setTimeout(() => void poll(), 1000);
        }
      } catch {
        if (!isCancelled)
          historyTimer = window.setTimeout(() => void poll(), 1000);
      }
    };

    void poll();
    return () => {
      isCancelled = true;
      if (historyTimer !== null) window.clearTimeout(historyTimer);
    };
  }, [processor]);

  useEffect(() => clearPolling, [clearPolling]);

  return {
    runJob,
    cancelJob,
    downloadJob,
    previewJob,
    history,
    status,
    progress,
    pagesCompleted,
    totalPages,
    message,
    pages,
    artifact,
    error,
  };
}
