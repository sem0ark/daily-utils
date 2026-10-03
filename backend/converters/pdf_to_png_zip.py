import asyncio
import os
import shutil
import tempfile
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

import fitz
from PIL import Image

from backend.jobs import Job

PROCESSOR_NAME = "pdf-to-png-archive"
PAGES_PER_ARCHIVE = 100
ARCHIVE_PAGE_OVERLAP = 1


def _render_page(page: fitz.Page, output: Path) -> None:
    """Render a PDF page as an optimized PNG."""
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    temporary = output.with_suffix(".tmp.png")
    pixmap.save(temporary)
    with Image.open(temporary) as image:
        image.save(output, format="PNG", optimize=True, compress_level=9)
    temporary.unlink(missing_ok=True)


def _render_page_from_pdf(file_path: str, page_index: int, output_path: str) -> None:
    """Render one PDF page in a worker process."""
    with fitz.open(file_path) as document:
        _render_page(document.load_page(page_index), Path(output_path))


def process_pdf_to_png_zip(job: Job, file_path: Path) -> None:
    """Convert PDF pages into nested archives of at most 100 pages."""
    work_dir = Path(tempfile.mkdtemp(prefix=f"daily-utils-{job.job_id}-"))
    archive = work_dir / "document-images.zip"
    temporary_pdf = work_dir / "source.pdf"
    group_output: ZipFile | None = None
    group_paths: list[Path] = []
    group_start_page = 1
    group_number = 1
    try:
        shutil.copyfile(file_path, temporary_pdf)
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
                image_paths = [
                    work_dir / f"page_{page_number:04d}.png"
                    for page_number in range(1, total_pages + 1)
                ]
                worker_count = min(5, os.cpu_count() or 1, total_pages)
                with ProcessPoolExecutor(max_workers=worker_count) as workers:
                    rendered_pages = workers.map(
                        _render_page_from_pdf,
                        [str(temporary_pdf)] * total_pages,
                        range(total_pages),
                        [str(image_path) for image_path in image_paths],
                    )
                    for page_number, _ in enumerate(rendered_pages, start=1):
                        image_path = image_paths[page_number - 1]
                        with job.lock:
                            if job.cancelled:
                                return
                        if group_output is None:
                            group_path = work_dir / (
                                f"document-images-{group_number:03d}.zip"
                            )
                            group_paths.append(group_path)
                            group_output = ZipFile(
                                group_path,
                                "w",
                                compression=ZIP_DEFLATED,
                                compresslevel=9,
                            )

                        assert group_output is not None
                        group_output.write(image_path, image_path.name)

                        is_group_boundary = (
                            page_number == group_start_page + PAGES_PER_ARCHIVE - 1
                        )
                        if is_group_boundary and page_number < total_pages:
                            group_output.close()
                            group_output = None
                            group_start_page = (
                                page_number + PAGES_PER_ARCHIVE - ARCHIVE_PAGE_OVERLAP
                            )
                            group_number += 1

                        if group_output is None and page_number < total_pages:
                            group_path = work_dir / (
                                f"document-images-{group_number:03d}.zip"
                            )
                            group_paths.append(group_path)
                            group_output = ZipFile(
                                group_path,
                                "w",
                                compression=ZIP_DEFLATED,
                                compresslevel=9,
                            )
                            assert group_output is not None
                            group_output.write(image_path, image_path.name)
                        image_path.unlink(missing_ok=True)
                        with job.lock:
                            job.pages_completed = page_number
                            job.progress = int(page_number / total_pages * 100)
                            job.message = (
                                f"Rendered page {page_number} of {total_pages}"
                            )

                if group_output is not None:
                    group_output.close()
                    group_output = None
                for group_path in group_paths:
                    output.write(group_path, group_path.name)
            with job.lock:
                job.result_path = archive
                job.result_paths = group_paths
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
        if group_output is not None:
            group_output.close()
        file_path.unlink(missing_ok=True)
        if job.status != "completed":
            shutil.rmtree(work_dir, ignore_errors=True)


class PDFToPNGArchiveProcessor:
    """Provide PDF-to-PNG archive processing without optional dependencies."""

    max_parallel_processes = 5

    async def process(self, job: Job, file_path: Path) -> None:
        """Run the synchronous converter as a background task."""
        await asyncio.to_thread(process_pdf_to_png_zip, job, file_path)

    async def stop(self) -> None:
        """Provide a common lifecycle interface for all processors."""
        return


def create_processor() -> PDFToPNGArchiveProcessor:
    """Create the PDF-to-PNG archive processor."""
    return PDFToPNGArchiveProcessor()
