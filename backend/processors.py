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

    async def stop(self) -> None:
        """Release dependencies owned by the processor."""


PROCESSOR_FACTORIES: dict[str, Callable[[], Processor]] = {
    ocr.PROCESSOR_NAME: ocr.create_processor,
    pdf_to_png_zip.PROCESSOR_NAME: pdf_to_png_zip.create_processor,
}
