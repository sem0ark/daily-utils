# Frontend UI Style Guide

Follow these conventions when adding or changing frontend UI. The goal is a clear, lightweight toolbox interface that remains consistent across utilities.

## Visual Language

- Use Tailwind classes and existing shared components.
- Keep layouts light, neutral, practical, and task-focused.
- Use the default font stack from `src/index.css`: `Inter, Avenir, Helvetica, Arial, sans-serif`.
- Use sentence case for labels and headings.
- Avoid gradients, heavy shadows, glass effects, and one-off visual systems.

### Defaults

- Use neutral surfaces and borders: `bg-neutral-50`, `border-neutral-500`, and `text-neutral-800`.
- Use blue for actions and progress: `blue-500`.
- Use red for errors and amber for unavailable optional services.
- Use `text-3xl font-bold text-center` for page titles.
- Use `font-mono text-sm` for raw or generated content.
- Use `rounded-lg border-2` for cards and panels.
- Use `gap-6` between page sections and `p-4` inside cards.

Always pair status colors with text or an icon.

## Page Layout

Most utilities should follow this structure:

```tsx
<div className="mx-auto max-w-4xl">
  <h1 className="mb-8 text-center text-3xl font-bold">Tool Name</h1>
  <div className="flex flex-col gap-6">...</div>
</div>
```

Use `max-w-6xl` for split-pane pages, such as Chat Search. Use responsive `flex-col` and grids by default.

## Components

- Use `FileUpload` for file picker and drag-and-drop input.
- Use `CopyToClipboard` for copy actions.
- Reuse components from `src/common/` before creating page-specific versions.
- Disable busy inputs with `pointer-events-none opacity-50`.

Typical text input:

```tsx
className="h-36 w-full rounded-lg border-2 border-neutral-200 bg-neutral-100 p-2 outline-none focus:border-neutral-500"
```

Typical action button:

```tsx
className="rounded-md border-2 border-neutral-500 px-3 py-1 text-sm font-bold hover:border-blue-500"
```

## States

Show progress with a neutral panel and blue progress bar. Show generated text in a labeled output panel with a copy action. Use a red panel for failures and an amber panel for unavailable optional services. Keep loading and disabled states visible.

## Navigation and Accessibility

- Add new utilities to `pages/routes.tsx` with a name, description, tags, icon, and visibility flags.
- Use semantic links, buttons, inputs, and headings.
- Add `aria-label` to icon-only controls.
- Preserve visible focus states.
- Keep long text and filenames from overflowing; use truncation or scrolling.
- Ensure controls remain usable on mobile.
