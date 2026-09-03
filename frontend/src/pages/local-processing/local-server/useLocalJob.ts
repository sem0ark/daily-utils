import { useCallback, useEffect, useRef, useState } from "react";
import { localApi } from "./api";
import type { JobStatus } from "./types";

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
  const jobId = useRef<string | null>(null);
  const timer = useRef<number | null>(null);
  const request = useRef<AbortController | null>(null);

  const clearPolling = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const runJob = useCallback(
    async (file: File) => {
      clearPolling();
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
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
        const id = await localApi.submitJob(file, processor, controller.signal);
        jobId.current = id;

        const poll = async () => {
          const state = await localApi.pollJob(id, controller.signal);
          setStatus(state.status);
          setProgress(state.progress);
          setPagesCompleted(state.pages_completed);
          setTotalPages(state.total_pages);
          setMessage(state.message);

          if (state.status === "completed") {
            if (resultMode === "file") {
              setArtifact(await localApi.getArtifact(id, controller.signal));
            } else {
              setPages(await localApi.getResult(id, controller.signal));
            }
            return;
          }
          if (state.status === "failed") {
            setError(state.error || state.message);
            return;
          }
          timer.current = window.setTimeout(() => void poll(), 1000);
        };
        await poll();
      } catch (caught) {
        if (controller.signal.aborted) return;
        setStatus("failed");
        setError(caught instanceof Error ? caught.message : "Local job failed");
      }
    },
    [clearPolling, processor, resultMode],
  );

  const cancelJob = useCallback(async () => {
    clearPolling();
    request.current?.abort();
    if (jobId.current) {
      try {
        await localApi.cancelJob(jobId.current);
      } catch {
        // The job may have completed between polling and cancellation.
      }
    }
    jobId.current = null;
    setStatus("idle");
    setMessage("");
  }, [clearPolling]);

  useEffect(
    () => () => {
      clearPolling();
      request.current?.abort();
    },
    [clearPolling],
  );

  return {
    runJob,
    cancelJob,
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
