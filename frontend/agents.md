# Frontend Agent Instructions

- Read [`README.md`](./README.md) before making frontend changes. Use it to understand the application structure, routing, feature boundaries, shared layers, and development commands.
- Always review [`style.md`](./style.md) before changing or adding UI. Follow its existing layout, typography, color, spacing, component, responsive, and accessibility conventions.
- Prefer existing shared components and patterns in `src/common/` over page-specific replacements.
- Register new utilities in `src/pages/routes.tsx` so routing, the home page, and the command menu stay consistent.
- Keep feature-specific logic within its feature directory and avoid introducing a new global abstraction unless it is genuinely reusable.
- Use `pnpm` for frontend commands. Do not replace repository commands with `npm`.
