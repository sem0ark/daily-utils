import asyncio
import shutil
import tempfile
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

import fitz
from PIL import Image

from backend.jobs import Job

PROCESSOR_NAME = "pdf-to-png-archive"


def _render_page(page: fitz.Page, output: Path) -> None:
    """Render a PDF page as an optimized PNG."""
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    temporary = output.with_suffix(".tmp.png")
    pixmap.save(temporary)
    with Image.open(temporary) as image:
        image.save(output, format="PNG", optimize=True, compress_level=9)
    temporary.unlink(missing_ok=True)


def process_pdf_to_png_zip(job: Job, file_path: Path) -> None:
    """Convert every PDF page to a compressed PNG archive."""
    work_dir = Path(tempfile.mkdtemp(prefix=f"daily-utils-{job.job_id}-"))
    archive = work_dir / "document-images.zip"
    try:
        with fitz.open(file_path) as document:
            total_pages = document.page_count
            if total_pages == 0:
                raise ValueError("The PDF has no pages")
            with job.lock:
                job.total_pages = total_pages
                job.status = "processing"
                job.message = f"Rendering {total_pages} page(s)"
            with ZipFile(
                archive, "w", compression=ZIP_DEFLATED, compresslevel=9
            ) as output:
                for page_number, page in enumerate(document, start=1):
                    with job.lock:
                        if job.cancelled:
                            return
                    image = work_dir / f"page_{page_number:04d}.png"
                    _render_page(page, image)
                    output.write(image, image.name)
                    image.unlink(missing_ok=True)
                    with job.lock:
                        job.pages_completed = page_number
                        job.progress = int(page_number / total_pages * 100)
                        job.message = f"Rendered page {page_number} of {total_pages}"
            with job.lock:
                job.result_path = archive
                job.status = "completed"
                job.progress = 100
                job.message = "Archive ready"
    except Exception as exc:  # noqa: BLE001
        shutil.rmtree(work_dir, ignore_errors=True)
        with job.lock:
            if not job.cancelled:
                job.status = "failed"
                job.message = "Conversion failed"
                job.error = str(exc)
    finally:
        file_path.unlink(missing_ok=True)
        if job.status != "completed":
            shutil.rmtree(work_dir, ignore_errors=True)


class PDFToPNGArchiveProcessor:
    """Provide PDF-to-PNG archive processing without optional dependencies."""

    async def process(self, job: Job, file_path: Path) -> None:
        """Run the synchronous converter as a background task."""
        await asyncio.to_thread(process_pdf_to_png_zip, job, file_path)

    async def stop(self) -> None:
        """Provide a common lifecycle interface for all processors."""
        return


def create_processor() -> PDFToPNGArchiveProcessor:
    """Create the PDF-to-PNG archive processor."""
    return PDFToPNGArchiveProcessor()
