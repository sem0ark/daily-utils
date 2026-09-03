export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface LocalServerHealthResponse {
  status: string;
  processors: string[];
}

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  progress: number;
  pages_completed: number;
  total_pages: number;
  message: string;
  error: string | null;
}

export interface JobResultResponse {
  pages: string[];
}
