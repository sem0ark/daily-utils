# Frontend

The frontend is a React/Vite single-page application containing the browser-based daily utilities. It is built as a static site and uses hash routing for GitHub Pages compatibility.

## Structure

```text
src/
├── main.tsx                 # React entry point
├── App.tsx                  # Router and route error boundary
├── index.css                # Global styles
├── common/                  # Shared UI, hooks, and types
│   ├── FileUpload.tsx
│   ├── hooks.tsx
│   └── components/
└── pages/
    ├── Layout.tsx           # Shared application shell
    ├── Home.tsx             # Utility directory
    ├── routes.tsx           # Central navigation registry
    ├── CommandMenu.tsx      # Searchable keyboard navigation
    ├── text-processing/
    ├── file-processing/
    ├── local-processing/
    └── chat-search/
```

## Application Flow

1. `main.tsx` mounts the React application.
2. `App.tsx` configures Wouter with hash-based routing.
3. `pages/routes.tsx` registers each utility, including its path, name, icon, description, tags, and page component.
4. Every route is rendered inside the shared `Layout`.
5. The home page and command menu derive their navigation entries from the same route registry.

The route registry is the main place to update when adding a utility. Set `showInHome` and `showInCommandMenu` to control where it appears.

## Feature Groups

### Text Processing

`pages/text-processing/` contains browser-only text transformations:

- Echo text
- Generate prompt templates
- Format Markdown

### File Processing

`pages/file-processing/` contains client-side document and transcript converters:

- PDF to Markdown using `pdfjs-dist`
- PPTX to Markdown using `JSZip` and XML parsing
- JSON3/SRT transcript formatting, including URL input

### Local Processing

`pages/local-processing/` contains utilities that use the optional local backend:

- Local OCR
- PDF to PNG archive conversion

`LocalServerProvider` discovers the local server and its available processors. `useLocalJob` handles uploads, polling, cancellation, job history, previews, and downloads.

### Chat Search

`pages/chat-search/` imports exported AI chat data and searches it locally:

- Dexie stores conversations in IndexedDB
- MiniSearch provides the in-memory search index
- Conversation components render results and previews

## Shared Functionality

- `common/FileUpload.tsx` provides file picker and drag-and-drop support.
- `common/hooks.tsx` contains browser integration hooks such as online-status and clipboard handling.
- `common/components/` contains reusable buttons, cards, and copy-to-clipboard UI.
- Feature-specific parsers and formatters are kept next to their page components.
- Tests are colocated with the implementation they cover.
