import asyncio
from pathlib import Path
from zipfile import ZipFile

from PIL import Image

from backend.jobs import Job
from backend.ocr import ocr as ocr_module


def test_process_ocr_completes_when_one_page_fails(tmp_path: Path) -> None:
    output_directory = tmp_path / "output"
    upload_path = tmp_path / "pages.zip"
    _create_two_page_archive(upload_path, tmp_path)
    job = Job(
        job_id="job-1",
        processor="ocr",
        file_name="pages.zip",
    )
    processed_pages: list[int] = []

    async def ocr(image_path: Path) -> str:
        page_number = int(image_path.stem.split("_")[-1])
        processed_pages.append(page_number)
        if page_number == 1:
            raise RuntimeError("cannot identify image")
        return "page two markdown"

    original_output_directory = ocr_module.OUTPUT_DIR
    ocr_module.OUTPUT_DIR = output_directory
    try:
        asyncio.run(ocr_module.process_ocr(job, upload_path, ocr))
    finally:
        ocr_module.OUTPUT_DIR = original_output_directory

    assert processed_pages == [1, 1, 1, 2]
    assert job.status == "completed"
    assert job.pages_completed == 2
    assert job.message == "Processing complete with 1 page error(s)"
    assert job.error == "Page 1: cannot identify image"
    assert "OCR failed for page 1" in job.pages[0]
    assert job.pages[1] == "page two markdown"


def _create_two_page_archive(
    archive_path: Path,
    temporary_directory: Path,
) -> None:
    first_image = temporary_directory / "first.png"
    second_image = temporary_directory / "second.png"
    Image.new("RGB", (10, 10), "white").save(first_image)
    Image.new("RGB", (10, 10), "black").save(second_image)
    with ZipFile(archive_path, "w") as archive:
        archive.write(first_image, "page_1.png")
        archive.write(second_image, "page_2.png")
