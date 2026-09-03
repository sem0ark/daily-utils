FRONTEND_DIR := frontend
BACKEND_DIR := backend

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
	cd $(FRONTEND_DIR) && pnpm run test

api-install:
	cd $(BACKEND_DIR) && uv sync

api-dev:
	cd $(BACKEND_DIR) && \
		PYTHONPATH=.. \
		DAILY_UTILS_OCR_COMMAND='mlx_vlm.generate --model mlx-community/DeepSeek-OCR-2-bf16 --image {input}' \
		uv run uvicorn main:app --host 127.0.0.1 --port 8888 --reload
