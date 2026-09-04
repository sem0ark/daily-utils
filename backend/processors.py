import asyncio
import logging
from collections.abc import Callable
from pathlib import Path
from typing import Protocol

from backend.converters import pdf_to_png_zip
from backend.jobs import Job
from backend.ocr import ocr

logger = logging.getLogger(__name__)


class Processor(Protocol):
    """Lifecycle contract implemented by every local processor."""

    async def process(self, job: Job, file_path: Path) -> None:
        """Process one uploaded file."""

    @property
    def max_parallel_processes(self) -> int:  # type: ignore
        """Return the number of jobs this processor can run concurrently."""

    async def stop(self) -> None:
        """Release dependencies owned by the processor."""


class ProcessorQueue:
    """Schedule processor jobs FIFO with a bounded number of workers."""

    def __init__(self, processor: Processor) -> None:
        """Create a queue around one processor instance."""
        self.processor = processor
        self.queue: asyncio.Queue[tuple[Job, Path]] = asyncio.Queue()
        self.workers: list[asyncio.Task[None]] = []

    async def enqueue(self, job: Job, file_path: Path) -> None:
        """Add a job to the processor queue and start its workers."""
        if not self.workers:
            num_workers = self.processor.max_parallel_processes
            logger.info(f"Creating {num_workers} workers for processor")
            self.workers = [
                asyncio.create_task(self._worker()) for _ in range(num_workers)
            ]
        queue_size = self.queue.qsize()
        logger.info(
            f"Enqueueing job {job.job_id} (queue size before: {queue_size}, active workers: {len(self.workers)})"
        )
        await self.queue.put((job, file_path))

    async def _worker(self) -> None:
        """Process queued jobs in FIFO order until the queue is stopped."""
        worker_id = id(asyncio.current_task())
        logger.info(f"Worker {worker_id} started")
        while True:
            logger.debug(
                f"Worker {worker_id} waiting for job (queue size: {self.queue.qsize()})"
            )
            job, file_path = await self.queue.get()
            logger.info(f"Worker {worker_id} got job {job.job_id}")
            try:
                with job.lock:
                    cancelled = job.cancelled
                if cancelled:
                    logger.info(
                        f"Worker {worker_id} skipping cancelled job {job.job_id}"
                    )
                    file_path.unlink(missing_ok=True)
                else:
                    logger.info(
                        f"Worker {worker_id} starting to process job {job.job_id}"
                    )
                    await self.processor.process(job, file_path)
                    logger.info(f"Worker {worker_id} completed job {job.job_id}")
            except Exception as exception:
                logger.exception(
                    f"Worker {worker_id} processing failed for job {job.job_id}",
                )
                try:
                    with job.lock:
                        if not job.cancelled:
                            job.status = "failed"
                            job.message = "Processing failed"
                            job.error = str(exception)
                except Exception:
                    logger.exception(
                        f"Worker {worker_id} failed to update job status for {job.job_id}",
                    )
            finally:
                self.queue.task_done()
                logger.debug(
                    f"Worker {worker_id} marked task done (queue size: {self.queue.qsize()})"
                )

    async def stop(self) -> None:
        """Stop workers and release the wrapped processor."""
        for worker in self.workers:
            worker.cancel()
        if self.workers:
            await asyncio.gather(*self.workers, return_exceptions=True)
        self.workers.clear()
        await self.processor.stop()


PROCESSOR_FACTORIES: dict[str, Callable[[], Processor]] = {
    ocr.PROCESSOR_NAME: ocr.create_processor,
    pdf_to_png_zip.PROCESSOR_NAME: pdf_to_png_zip.create_processor,
}
