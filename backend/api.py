import tempfile
from collections.abc import AsyncGenerator, Awaitable, Callable
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import (
    FastAPI,
    Form,
    HTTPException,
    Request,
    Response,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from backend.config import MAX_FILE_SIZE, allowed_origins
from backend.jobs import JobStore
from backend.processors import PROCESSOR_FACTORIES, ProcessorQueue


def create_app(supported_processors: list[str] | None = None) -> FastAPI:
    """Build an API exposing only the processors selected at startup."""
    enabled_processors = set(supported_processors or [])
    unsupported_processors = enabled_processors - PROCESSOR_FACTORIES.keys()
    if unsupported_processors:
        names = ", ".join(sorted(unsupported_processors))
        raise ValueError(f"Unsupported processors: {names}")

    store = JobStore()
    processors: dict[str, ProcessorQueue] = {
        name: ProcessorQueue(factory())
        for name, factory in PROCESSOR_FACTORIES.items()
        if name in enabled_processors
    }

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncGenerator[None]:
        """Stop enabled processors when the application shuts down."""
        yield
        for processor in processors.values():
            await processor.stop()

    app = FastAPI(
        title="Daily Utils Local API",
        version="1.0.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins(),
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def add_private_network_header(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        """Allow browser clients to call the local API from private networks."""
        response = await call_next(request)
        response.headers["Access-Control-Allow-Private-Network"] = "true"

        return response

    @app.get("/health")
    async def health() -> dict[str, Any]:
        """Report API availability and the enabled processors."""

        return {
            "status": "ok",
            "processors": sorted(processors),
        }

    @app.post("/v1/jobs", status_code=202)
    async def create_job(
        file: UploadFile,
        processor: str = Form(...),
    ) -> dict[str, str]:
        """Store an upload and schedule an enabled processor."""
        if processor not in enabled_processors:
            raise HTTPException(400, "Processor is not enabled")
        job = store.create(processor, file.filename or "upload")
        suffix = Path(file.filename or "upload").suffix or ".bin"
        temporary = Path(tempfile.gettempdir()) / f"{job.job_id}{suffix}"
        size = 0
        with temporary.open("wb") as output:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_FILE_SIZE:
                    temporary.unlink(missing_ok=True)
                    raise HTTPException(413, "File is too large")
                output.write(chunk)
        if size == 0:
            temporary.unlink(missing_ok=True)
            raise HTTPException(400, "File is empty")
        await processors[processor].enqueue(job, temporary)

        return {"job_id": job.job_id}

    @app.get("/v1/jobs")
    async def list_jobs(processor: str) -> list[dict[str, Any]]:
        """List all retained jobs for a processor, including active jobs."""
        if processor not in enabled_processors:
            raise HTTPException(400, "Processor is not enabled")
        return [job.status_response() for job in store.list(processor)]

    @app.get("/v1/jobs/{job_id}")
    async def get_job(job_id: str) -> dict[str, Any]:
        """Return progress information for one submitted job."""
        job = store.get(job_id)

        if job is None:
            raise HTTPException(404, "Job not found")

        return job.status_response()

    @app.get("/v1/jobs/{job_id}/result")
    async def get_result(job_id: str) -> Response:
        """Return completed OCR pages or explain why they are unavailable."""
        job = store.get(job_id)

        if job is None:
            raise HTTPException(404, "Job not found")

        with job.lock:
            if job.status != "completed":
                raise HTTPException(409, "Job not completed")
            if job.processor == "pdf-to-png-archive":
                if job.result_path is None or not job.result_path.is_file():
                    raise HTTPException(404, "Job result not found")
                return FileResponse(
                    job.result_path,
                    media_type="application/zip",
                    filename="document-images.zip",
                )
            return JSONResponse(content={"pages": job.pages})

    @app.delete("/v1/jobs/{job_id}", status_code=204)
    async def cancel_job(job_id: str) -> None:
        """Mark queued or active work as cancelled for the processor to observe."""
        job = store.get(job_id)

        if job is None:
            raise HTTPException(404, "Job not found")

        with job.lock:
            if job.status in {"pending", "processing"}:
                job.cancelled = True
                job.status = "failed"
                job.message = "Cancelled"
                job.error = "Job cancelled by client"

    return app
