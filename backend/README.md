# Daily Utils Local API

The backend is a small FastAPI server for local file processing. The server
only enables processors passed on the command line, so optional dependencies
are loaded only when their processor is selected.

## Installation

Install the base dependencies for processors that do not use MLX:

```bash
cd backend
uv sync
```

Install the optional MLX dependency group only when OCR is needed:

```bash
uv sync --group mlx
```

The `mlx` group contains `mlx-vlm` and `openai`. It is intentionally separate
so PDF conversion can run on machines that do not support MLX.

## Starting the server

Start one or more processors by name:

```bash
# PDF conversion only; does not import or start MLX.
PYTHONPATH=.. uv run python -m backend.main pdf-to-png-archive

# OCR and PDF conversion.
PYTHONPATH=.. uv run --group mlx python -m backend.main \
  ocr pdf-to-png-archive
```

The available processor names are registered in `backend/processors.py`:

- `ocr` — extracts markdown from PDFs, images, and ZIP archives of images.
- `pdf-to-png-archive` — converts PDF pages into a ZIP archive of PNG files.

From the repository root, use the Makefile. The default starts both
processors and installs MLX only for that configuration:

```bash
make api-install
make api-dev
```

Run a non-MLX server instead:

```bash
make api-dev API_PROCESSORS=pdf-to-png-archive
```

OCR creates its MLX engine when the processor is enabled and starts
`mlx_vlm.server` on the first OCR request. Set `MLX_MODEL` to choose the
model.

## Configuration

All settings are optional environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DAILY_UTILS_HOST` | `127.0.0.1` | API bind host |
| `DAILY_UTILS_PORT` | `8888` | API bind port |
| `MLX_MODEL` | `mlx-community/DeepSeek-OCR-2-bf16` | OCR model |
| `MLX_SERVER_PORT` | `11434` | MLX server port |
| `DAILY_UTILS_MAX_FILE_SIZE` | `104857600` | Maximum upload size in bytes |
| `DAILY_UTILS_JOB_TIMEOUT` | `1800` | OCR timeout in seconds |
| `DAILY_UTILS_ALLOWED_ORIGINS` | Built-in local and hosted origins | Comma-separated CORS origins |

## API workflow

1. Check server availability with `GET /health`.
2. Submit a file with `POST /v1/jobs`, providing the `processor` form field.
3. Poll `GET /v1/jobs/{job_id}` for progress.
4. Fetch the completed output with `GET /v1/jobs/{job_id}/result`.
5. Cancel pending work with `DELETE /v1/jobs/{job_id}`.

The health response also advertises the enabled processors:

```json
{
  "status": "ok",
  "processors": ["pdf-to-png-archive"]
}
```

Example submission:

```bash
curl -X POST http://127.0.0.1:8888/v1/jobs \
  -F 'processor=pdf-to-png-archive' \
  -F 'file=@document.pdf'
```

The result endpoint returns JSON with `pages` for OCR and a ZIP download for
`pdf-to-png-archive`. A processor that was not enabled at startup returns a
`400` response when requested.

## Code structure

- `main.py` parses processor names and starts Uvicorn.
- `api.py` exposes the HTTP API and coordinates jobs.
- `processors.py` provides the processor protocol and factory registry.
- `ocr/` owns OCR rendering and its MLX engine lifecycle.
- `converters/` contains processors that work without MLX.
- `jobs.py` stores in-memory job state and progress.
- `config.py` reads environment-based configuration.
