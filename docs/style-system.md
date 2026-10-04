# Daily Utils Style System

This document defines the visual language and user-experience expectations for Daily Utils. New pages should extend the existing system rather than introduce a separate component library or visual direction.

## Product Feel

Daily Utils should feel like a focused toolbox for practical work:

- Clear and utilitarian rather than decorative.
- Lightweight, fast, and local-first.
- Friendly through restrained blue accents, not bright gradients or excessive illustration.
- Dense enough for productive workflows, with generous spacing around major sections.
- Familiar across tools: users should recognize the same upload areas, cards, borders, buttons, and loading states on every page.

The interface should communicate that utilities are safe to use and easy to understand. Explanations belong near the action, errors should be actionable, and processing state must always be visible.

## Visual Direction

The current frontend uses Tailwind CSS v4 with a neutral surface palette and blue interaction accents. Preserve this direction:

- Use neutral grays for page structure, borders, surfaces, and secondary text.
- Use blue for links, primary emphasis, active controls, and progress indicators.
- Use red only for errors, destructive warnings, or offline problems.
- Prefer white and near-white surfaces over dark panels.
- Avoid purple-on-white, neon colors, large gradients, and decorative backgrounds unless a future design decision explicitly introduces them.

## Color System

Use existing Tailwind color utilities where possible. Do not add one-off hex values to individual components.

| Role | Tailwind examples | Usage |
| --- | --- | --- |
| Page surface | default, `bg-white` | Main application background and readable content areas |
| Soft surface | `bg-neutral-50` | Cards, output containers, inactive panels |
| Muted surface | `bg-neutral-100` | Upload zones, progress panels, secondary controls |
| Primary border | `border-neutral-500` | Main panels, output blocks, prominent cards |
| Subtle border | `border-neutral-200`, `border-neutral-300` | Navigation, separators, inactive controls |
| Primary text | `text-neutral-800`, `text-neutral-900` | Headings and important content |
| Secondary text | `text-neutral-500`, `text-neutral-600` | Help text, metadata, descriptions |
| Primary accent | `text-blue-500`, `bg-blue-500` | Links, active states, progress, primary emphasis |
| Accent hover | `text-blue-600`, `border-blue-500` | Hover and focus states |
| Error surface | `bg-red-50` | Error messages and failed operations |
| Error border/text | `border-red-500`, `text-red-600` | Errors and validation failures |

Color requirements:

- Text must remain readable against its surface.
- Do not communicate state through color alone; pair it with text, iconography, or structure.
- Focus states must be visible without relying only on browser defaults.
- Blue should indicate an action or active state, not be applied to every piece of text.

## Typography

The existing stylesheet defines the default font family through the Tailwind theme. Follow the current typography hierarchy:

- Page title: `text-3xl font-bold`, usually centered on utility pages.
- Section heading: `text-xl` or `text-2xl font-bold`.
- Card title: `text-xl font-bold text-blue-500` when the card links to a tool.
- Body text: default size with `text-neutral-800` or inherited color.
- Supporting text: `text-neutral-500` or `text-neutral-600` at the default body size.
- Technical output: `font-mono` where fixed-width text improves readability.

Typography should be concise and functional. Use sentence case for labels, headings, buttons, and descriptions. Avoid all-caps labels except for short metadata where it is already established by the surrounding component.

Avoid small text in the interface: do not use `text-sm`, `text-xs`, or smaller for labels, supporting copy, metadata, or technical output. Use the default body size or `text-base` minimum so content remains readable across screen sizes.

## Layout and Spacing

Utility pages should use the existing centered content layout:

```tsx
<div className="mx-auto max-w-4xl">
  <h1 className="mb-8 text-center text-3xl font-bold">Tool Name</h1>
  <div className="flex flex-col gap-6">...</div>
</div>
```

Layout rules:

- Use `mx-auto` and a deliberate `max-w-*` value.
- Use `gap-6` between major workflow stages.
- Use `p-4`, `p-6`, or `p-12` according to content density.
- Keep primary content aligned to a common left edge.
- Use responsive grids only when they improve comparison or workflow speed.
- On narrow screens, stack columns rather than forcing horizontal scrolling.
- Keep long text and generated output within the viewport with `min-w-0`, wrapping, or controlled overflow.

Suggested widths:

- `max-w-4xl`: single-document processors and simple forms.
- `max-w-6xl`: search, dashboards, and two-column tools.
- `max-w-7xl`: application shell and wide navigation areas.

## Borders, Cards, and Surfaces

The visual system uses visible borders to define functional areas:

- Primary panels: `rounded-lg border-2 border-neutral-500 bg-neutral-50`.
- Interactive cards: `rounded-lg border-2 border-neutral-500 bg-neutral-50 hover:bg-white`.
- Drop zones: `rounded-xl border-2 border-neutral-200 bg-neutral-100`.
- Output headers: rounded top corners with a matching border and a muted surface.
- Output bodies: matching bottom corners and a readable white or near-white surface.

Cards should be purposeful, not decorative. A card should represent a tool, a result, a file, or a distinct workflow state. Do not nest multiple heavy bordered cards unless the hierarchy requires it.

## Interaction States

Every interactive control needs a complete state model:

- Default: neutral surface and visible border.
- Hover: stronger border, white surface, or blue text.
- Focus: visible blue border or ring and preserved keyboard outline.
- Active/selected: blue border or restrained blue surface.
- Disabled: reduced contrast, blocked pointer interaction, and a clear disabled label where appropriate.
- Loading: prevent duplicate actions and show progress or a spinner.
- Error: preserve the page and show a nearby actionable message.

Existing patterns include:

```tsx
className="rounded-lg border-2 border-neutral-200 bg-neutral-100 px-3 py-2 font-bold text-blue-500 transition-all hover:border-neutral-500"
```

and:

```tsx
className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-blue-500"
```

Do not make an entire control look disabled while it is still clickable. Do not hide errors in console output only.

## Buttons and Links

Buttons should describe the action with a verb:

- `Upload files`
- `Extract text`
- `Copy output`
- `Download result`
- `Clear search`

Use blue text or blue borders for primary emphasis, while keeping the existing neutral button surfaces. Links should be visibly identifiable and should explain where they go, especially external links.

Reuse shared components when they match the interaction. Extend a shared component when several pages need the same behavior; do not duplicate subtly different upload or button implementations.

## File Upload UX

Use `frontend/src/common/FileUpload.tsx` for file-based tools.

Requirements:

- Support click-to-browse and drag-and-drop.
- Show a visible upload icon and a clear drop target.
- Restrict accepted file types through the component API.
- Ignore invalid files safely and explain what is accepted near the control.
- Disable or visually mute the upload area while processing.
- Preserve the selected file context and show processing status.
- Never make users guess whether a file was accepted.

For local-only features, explicitly state that files remain in the browser and are not uploaded.

## Forms and Inputs

Inputs should use the same neutral/blue treatment:

```tsx
className="w-full rounded-lg border-2 border-neutral-500 bg-neutral-50 p-3 outline-none focus:border-blue-500 focus:bg-white"
```

Requirements:

- Every input needs a meaningful placeholder or visible label.
- Search inputs should support clearing and should not lose focus unexpectedly.
- Use buttons for actions, not clickable text or non-semantic containers.
- Preserve values when an operation fails so users can correct and retry.
- Use `aria-label` for icon-only controls.

## Loading, Empty, and Error States

These states are part of the design, not afterthoughts.

### Loading

Use the existing centered spinner style for route-level loading. For operation-level loading, place status text next to or above the affected content:

```tsx
<p className="font-bold text-blue-500">Processing document...</p>
```

Disable duplicate submissions while work is in progress.

### Empty

Explain what the user can do next:

```tsx
<div className="rounded-lg border-2 border-dashed border-neutral-300 p-12 text-center text-neutral-500">
  Upload a file to see results here.
</div>
```

Avoid blank panels and avoid showing “No results” before the user has performed an action unless the distinction is clear.

### Error

Use a nearby red panel:

```tsx
<div className="rounded-lg border-2 border-red-500 bg-red-50 p-4 font-bold text-red-600">
  Processing failed. Check the file format and try again.
</div>
```

Errors should say what failed and, when possible, how to recover. Preserve user input and cached results unless they are unsafe or invalid.

## Navigation and Discoverability

The application shell provides:

- A home icon linking to `/`.
- A global command menu opened with the existing keyboard shortcuts.
- A visible online/offline indicator.
- A shared `max-w-7xl` navigation container.

Every new utility must be registered in `NAVIGATION_CONFIG` with:

- A concise name.
- A useful description.
- Search tags for command-menu discovery.
- An appropriate Heroicon.
- Correct home and command-menu visibility.

Tool names should describe the user outcome, not the internal implementation.

## Responsive UX

The site must remain usable on phones and desktop screens:

- Stack multi-column workflows below the large breakpoint.
- Keep controls full width on small screens.
- Avoid fixed widths except for intentional desktop sidebars.
- Allow result lists to scroll independently only when that improves scanning.
- Keep action buttons reachable without horizontal scrolling.
- Ensure Markdown, code, tables, and generated output can scroll or wrap safely.

## Accessibility

All pages must meet these baseline requirements:

- Use semantic headings in order.
- Use buttons for button actions and anchors for navigation.
- Provide accessible names for icon-only controls.
- Make focus states visible.
- Do not rely on hover-only information.
- Ensure keyboard users can upload, search, select results, and operate expandable content.
- Use `aria-live` for important asynchronous status changes when appropriate.
- Keep contrast sufficient for muted text and disabled states.

## Motion and Feedback

Motion should be functional and restrained:

- Use existing `transition-colors`, `transition-all`, and spinner patterns.
- Animate progress changes and loading indicators, not every hover unnecessarily.
- Avoid movement that shifts primary controls while the user is interacting.
- Respect reduced-motion preferences if introducing new animations.

## Content and Copy

Copy should be short, direct, and specific:

- Explain the action before the user performs it.
- Name accepted file formats explicitly.
- Use “your” for local data and privacy explanations.
- Prefer “Import” for bringing files into the browser and “Export” for creating files.
- Use “Clear” for removing an input and “Delete” only when persisted data is being removed.
- Avoid technical jargon unless it helps the intended user complete the task.

## Implementation Checklist

Before considering a new page complete, verify:

- It uses the shared layout and Tailwind conventions.
- It reuses existing upload, card, navigation, and loading components where appropriate.
- It has clear loading, empty, success, and error states.
- It works with keyboard navigation and has accessible labels.
- It is usable on mobile and desktop.
- It does not introduce an unrelated color palette, typography system, or visual language.
- It preserves local data and user input during recoverable errors.
- Its route is discoverable from both the home page and command menu when appropriate.
