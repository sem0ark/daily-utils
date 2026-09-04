import importlib
import logging
import shutil
import tempfile
from collections.abc import Awaitable, Callable
from pathlib import Path
from zipfile import ZipFile

import fitz
from PIL import Image

from backend.config import OUTPUT_DIR
from backend.jobs import Job

logger = logging.getLogger(__name__)
PROCESSOR_NAME = "ocr"


def _markdown_path(job: Job, image_number: int) -> Path:
    """Return the durable markdown path for one processed image."""
    file_stem = Path(job.file_name).stem or "upload"
    return OUTPUT_DIR / f"{file_stem}-{image_number:04}.md"


def _safe_extract_images(archive: Path, target: Path) -> list[Path]:
    """Extract supported archive members while preventing path traversal."""
    extensions = {".png", ".jpg", ".jpeg", ".webp"}
    paths: list[Path] = []
    target_root = target.resolve()
    with ZipFile(archive) as source:
        for member in source.infolist():
            destination = (target / member.filename).resolve()
            if target_root not in destination.parents:
                continue
            if Path(member.filename).suffix.lower() not in extensions:
                continue
            destination.parent.mkdir(parents=True, exist_ok=True)
            with source.open(member) as input_file, destination.open("wb") as output:
                shutil.copyfileobj(input_file, output)
            paths.append(destination)
    return sorted(paths)


def _image_paths(file_path: Path, target: Path) -> list[Path]:
    """Convert an upload into image paths suitable for OCR processing."""
    suffix = file_path.suffix.lower()
    if suffix == ".pdf":
        with fitz.open(file_path) as document:
            paths = []
            for page_number, page in enumerate(document, start=1):
                image_path = target / f"page_{page_number}.png"
                page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False).save(image_path)
                paths.append(image_path)
        return paths
    if suffix == ".zip":
        return _safe_extract_images(file_path, target)
    with Image.open(file_path) as image:
        image.verify()
    return [file_path]


async def process_ocr(
    job: Job,
    file_path: Path,
    ocr: Callable[[Path], Awaitable[str]],
) -> None:
    """Render an upload, process each page, and publish progress on the job."""
    logger.info(f"[OCR] Starting OCR processing for job {job.job_id}")
    temporary = Path(tempfile.mkdtemp(prefix=f"daily-utils-{job.job_id}-"))
    try:
        image_paths = _image_paths(file_path, temporary)
        if not image_paths:
            raise ValueError("No supported images found in the uploaded archive")
        logger.info(f"[OCR] Job {job.job_id}: extracted {len(image_paths)} images")
        with job.lock:
            job.total_pages = len(image_paths)
            job.status = "processing"
            job.message = f"Processing {len(image_paths)} page(s)"
        for page_number, image_path in enumerate(image_paths, start=1):
            with job.lock:
                if job.cancelled:
                    logger.info(
                        f"[OCR] Job {job.job_id} was cancelled, returning early"
                    )
                    return
            logger.debug(f"[OCR] Job {job.job_id}: processing page {page_number}")
            markdown = await ocr(image_path)
            output_path = _markdown_path(job, page_number)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(markdown, encoding="utf-8")
            with job.lock:
                job.pages.append(markdown)
                job.pages_completed = page_number
                job.progress = int(job.pages_completed / job.total_pages * 100)
                job.message = (
                    f"Processed page {job.pages_completed} of {job.total_pages}"
                )
        logger.info(f"[OCR] Job {job.job_id}: OCR processing completed successfully")
        with job.lock:
            job.status = "completed"
            job.progress = 100
            job.message = "Processing complete"
    except Exception as exception:
        logger.exception(f"[OCR] Job {job.job_id}: OCR processing failed")
        with job.lock:
            if not job.cancelled:
                job.status = "failed"
                job.message = "Processing failed"
                job.error = str(exception)
    finally:
        shutil.rmtree(temporary, ignore_errors=True)
        file_path.unlink(missing_ok=True)


class OCRProcessor:
    """Own the OCR processor's MLX dependency and lifecycle."""

    max_parallel_processes = 1

    def __init__(self) -> None:
        """Create the MLX engine only when OCR is selected by the server."""
        mlx_module = importlib.import_module("backend.ocr.mlx_engine")
        self.engine = mlx_module.MLXEngine()

    async def process(self, job: Job, file_path: Path) -> None:
        """Run OCR using this processor's private engine."""
        await process_ocr(job, file_path, self.engine.ocr)

    async def stop(self) -> None:
        await self.engine.stop()


def create_processor() -> OCRProcessor:
    """Create OCR and its optional MLX dependencies together."""
    return OCRProcessor()
