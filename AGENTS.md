# AGENTS.md

## Repository Overview

- Daily Utils is a local-first utilities application with a React/Vite frontend and a FastAPI backend.
- `frontend/` contains the browser application, pages, shared components, and Vitest tests.
- `backend/` contains the Python API, background job coordination, OCR, PDF conversion, and pytest tests.
- `docs/` contains the Python conventions and frontend style system. Follow both when working in their scopes.
- The root `Makefile` is the preferred interface for installation, formatting, testing, and development commands.
- The backend uses `uv`; the frontend uses `pnpm`.

## Commands

- **Use the root Makefile**: `make front-install`, `make api-install`, `make lint`, `make test`, `make front-build`.
- Use `make front-lint` or `make api-lint` to validate one application.
- Run one frontend test with `make front-test TEST_FILE=path/to/test.ts`.
- Run one backend test with `make api-test TEST_ARGS='test.py::test_name'`.


## Project Boundaries

- `backend/main.py` parses processor names and starts Uvicorn; keep startup configuration there.
- `backend/api.py` owns HTTP routes, uploads, result downloads, and API-facing validation.
- `backend/processors.py` defines processor registration and queue coordination.
- `backend/jobs.py` owns in-memory job state, locks, progress, and cancellation flags.
- `backend/ocr/` contains OCR rendering, layout parsing, and the optional MLX engine lifecycle.
- `backend/converters/` contains processors that can run without MLX dependencies.
- `frontend/src/pages/` contains route-level tools; `frontend/src/common/` contains shared UI and types.
- Local-server client code belongs under `frontend/src/pages/local-processing/local-server/`.
- Keep API response types synchronized between backend responses and frontend `types.ts` modules.
- Do not import optional MLX modules from code paths used by non-OCR processors.

## General Workflow

- Read nearby code and existing tests before editing; preserve established module boundaries.
- Reuse existing shared components, utilities, API types, and style tokens before creating new ones.
- Keep frontend-only and backend-only changes isolated unless the API contract requires both.
- Run the narrowest relevant test while iterating, then run `make format` and `make test` before finishing when practical.
- Do not commit secrets, generated output, local environment files, or dependency directories.
- Let `make lint` apply formatting and import sorting; do not perform manual style checks.
- Add tests for behavior changes, edge cases, and error paths.
- Do not introduce new libraries or conventions without a repository-wide need.

## Frontend

- Follow `docs/style-system.md` rather than inventing a new component or visual language.
- Use neutral surfaces and borders with restrained blue interaction accents; reserve red for errors.
- Prefer existing Tailwind utilities and shared `Card`, button, upload, navigation, and loading patterns.
- Keep utility pages centered with deliberate `max-w-*` widths and stack workflows on small screens.
- Use sentence-case, action-oriented labels such as `Upload files` or `Copy output`.
- Provide visible loading, empty, success, and error states near the affected workflow.
- Preserve user input and cached results when a recoverable request fails.
- New utilities must be registered in the route and navigation/command-menu configuration.

Testing:
- Use Vitest with `describe`/`it` and focused assertions; keep tests close to the source under test.
- Test pure transformations with representative normal, empty, malformed, and boundary inputs.
- For UI changes, verify loading, success, error, keyboard, mobile, and disabled states where relevant.
- Update route/navigation configuration when adding a utility so it is discoverable from the home page and command menu.
