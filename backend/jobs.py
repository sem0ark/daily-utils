import threading
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


@dataclass
class Job:
    job_id: str
    processor: str
    file_name: str
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    status: str = "pending"
    progress: int = 0
    pages_completed: int = 0
    total_pages: int = 0
    message: str = "Queued"
    pages: list[str] = field(default_factory=list)
    result_path: Path | None = None
    error: str | None = None
    cancelled: bool = False
    lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def status_response(self) -> dict[str, Any]:
        """Return a consistent snapshot for the job status endpoint."""
        with self.lock:
            return {
                "job_id": self.job_id,
                "file_name": self.file_name,
                "created_at": self.created_at,
                "status": self.status,
                "progress": self.progress,
                "pages_completed": self.pages_completed,
                "total_pages": self.total_pages,
                "message": self.message,
                "error": self.error,
            }

    def set_progress(self, progress: int, message: str) -> None:
        """Update progress unless a client has already cancelled the job."""
        with self.lock:
            if not self.cancelled:
                self.progress = max(0, min(100, progress))
                self.message = message


class JobStore:
    """Keep jobs addressable by identifier while background work is running."""

    def __init__(self) -> None:
        """Create an empty, thread-safe job collection."""
        self._jobs: dict[str, Job] = {}
        self._lock = threading.Lock()

    def create(self, processor: str, file_name: str) -> Job:
        """Create and retain a job for the requested processor."""
        job = Job(
            job_id=str(uuid.uuid4()),
            processor=processor,
            file_name=file_name,
        )
        with self._lock:
            self._jobs[job.job_id] = job
        return job

    def get(self, job_id: str) -> Job | None:
        """Return a job by identifier, or ``None`` when it is unknown."""
        with self._lock:
            return self._jobs.get(job_id)

    def list(self, processor: str) -> list[Job]:
        """Return all jobs for a processor, newest first."""
        with self._lock:
            jobs = [job for job in self._jobs.values() if job.processor == processor]
        return sorted(jobs, key=lambda job: job.created_at, reverse=True)
