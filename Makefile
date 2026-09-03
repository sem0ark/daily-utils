FRONTEND_DIR := frontend

.PHONY: front-install front-dev front-build format test

front-install:
	cd $(FRONTEND_DIR) && pnpm install --frozen-lockfile

front-dev:
	cd $(FRONTEND_DIR) && pnpm run dev

front-build:
	cd $(FRONTEND_DIR) && pnpm run build

format:
	cd $(FRONTEND_DIR) && pnpm run lint

test:
	cd $(FRONTEND_DIR) && pnpm run test
