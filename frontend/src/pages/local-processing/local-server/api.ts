import type {
  JobResultResponse,
  JobStatusResponse,
  LocalServerHealthResponse,
} from "./types";

export const LOCAL_SERVER_URL = (
  import.meta.env.VITE_LOCAL_SERVER_URL || "http://127.0.0.1:8888"
).replace(/\/$/, "");

async function parseError(response: Response): Promise<never> {
  let detail = response.statusText;
  try {
    const body = (await response.json()) as { detail?: string };
    detail = body.detail || detail;
  } catch {
    // Keep the HTTP status when the server did not return JSON.
  }
  throw new Error(detail || `Local server request failed (${response.status})`);
}

export const localApi = {
  async getHealth(
    signal?: AbortSignal,
  ): Promise<LocalServerHealthResponse | null> {
    try {
      const response = await fetch(`${LOCAL_SERVER_URL}/health`, { signal });
      if (!response.ok) return null;
      return (await response.json()) as LocalServerHealthResponse;
    } catch {
      return null;
    }
  },

  async submitJob(
    file: File,
    processor: string,
    signal?: AbortSignal,
  ): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("processor", processor);

    const response = await fetch(`${LOCAL_SERVER_URL}/v1/jobs`, {
      method: "POST",
      body: formData,
      signal,
    });
    if (!response.ok) await parseError(response);
    const data = (await response.json()) as { job_id?: string };
    if (!data.job_id) throw new Error("Local server returned no job id");
    return data.job_id;
  },

  async pollJob(
    jobId: string,
    signal?: AbortSignal,
  ): Promise<JobStatusResponse> {
    const response = await fetch(`${LOCAL_SERVER_URL}/v1/jobs/${jobId}`, {
      signal,
    });
    if (!response.ok) await parseError(response);
    return (await response.json()) as JobStatusResponse;
  },

  async getResult(jobId: string, signal?: AbortSignal): Promise<string[]> {
    const response = await fetch(
      `${LOCAL_SERVER_URL}/v1/jobs/${jobId}/result`,
      {
        signal,
      },
    );
    if (!response.ok) await parseError(response);
    const data = (await response.json()) as JobResultResponse;
    return data.pages;
  },

  async getArtifact(jobId: string, signal?: AbortSignal): Promise<Blob> {
    const response = await fetch(
      `${LOCAL_SERVER_URL}/v1/jobs/${jobId}/result`,
      {
        signal,
      },
    );
    if (!response.ok) await parseError(response);
    return response.blob();
  },

  async cancelJob(jobId: string): Promise<void> {
    const response = await fetch(`${LOCAL_SERVER_URL}/v1/jobs/${jobId}`, {
      method: "DELETE",
    });
    if (!response.ok) await parseError(response);
  },
};
