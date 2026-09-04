FRONTEND_DIR := frontend
BACKEND_DIR := backend
API_PROCESSORS ?= ocr pdf-to-png-archive
API_UV_GROUP :=
ifneq (,$(findstring ocr,$(API_PROCESSORS)))
API_UV_GROUP := --group mlx
endif

.PHONY: front-install front-dev front-build front-format api-format format test api-dev api-install

front-install:
	cd $(FRONTEND_DIR) && pnpm install --frozen-lockfile

front-dev:
	cd $(FRONTEND_DIR) && pnpm run dev

front-build:
	cd $(FRONTEND_DIR) && pnpm run build

front-format:
	cd $(FRONTEND_DIR) && pnpm run lint

api-format:
	cd $(BACKEND_DIR) && \
		uv run --with ruff ruff check --fix .; \
		uv run --with ruff ruff check --select I --fix .; \
		uv run --with ruff ruff format .

format: front-format api-format

test:
	cd $(FRONTEND_DIR) && pnpm run test-ci
	cd $(BACKEND_DIR) && PYTHONPATH=.. uv run --group dev pytest

api-install:
	cd $(BACKEND_DIR) && uv sync

api-dev:
	cd $(BACKEND_DIR) && \
		PYTHONPATH=.. \
		uv run $(API_UV_GROUP) python -m backend.main $(API_PROCESSORS)
