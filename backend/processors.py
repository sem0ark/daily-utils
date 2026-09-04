import asyncio
from collections.abc import Callable
from pathlib import Path
from typing import Protocol

from backend.converters import pdf_to_png_zip
from backend.jobs import Job
from backend.ocr import ocr


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
            self.workers = [
                asyncio.create_task(self._worker())
                for _ in range(self.processor.max_parallel_processes)
            ]
        await self.queue.put((job, file_path))

    async def _worker(self) -> None:
        """Process queued jobs in FIFO order until the queue is stopped."""
        while True:
            job, file_path = await self.queue.get()
            try:
                with job.lock:
                    cancelled = job.cancelled
                if cancelled:
                    file_path.unlink(missing_ok=True)
                else:
                    await self.processor.process(job, file_path)
            finally:
                self.queue.task_done()

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
