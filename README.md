# LITD — Collaborative Knowledge Workspace

A collaborative knowledge workspace powered by [Lexical](https://lexical.dev/) and [tldraw](https://tldraw.dev/).

## Features

- **Rich document editing** via Lexical with Yjs-backed collaborative document state
- **Freeform canvas mode** via tldraw with per-page local persistence
- **Generic sidebar collections** with stored category metadata and page membership
- **Editable workspace branding** for the shell title/subtitle plus document/canvas labels and badges
- **Seeded generic workspace collections**:
  - Notes · Research · People · Spaces · Projects
- **Create, rename, and remove collections** plus create new pages in any collection
- **CRDT-backed document model** using Yjs, Hocuspocus, and IndexedDB persistence
- **Two built-in themes** with an instant switcher in the sidebar footer
- **Lucide icons** throughout — no emoji

## Current Status

This repo is partway through the broader "general knowledge workspace" plan.

- Implemented today: generic shell vocabulary, seeded non-TTRPG collections, workspace/mode branding, category metadata persistence, a normalized shared page-content schema, and an initial block-registry seam for Lexical.
- Partially implemented: document-mode top-level Lexical blocks now sync into `PageContentModel`, while live collaboration still runs through Yjs/Hocuspocus. Canvas still persists its own tldraw state by page id.
- Not implemented yet: asset library UI/storage flows, PDF rendering/embed modes, pinned block surfaces, mechanics-aware blocks, faceted retrieval UX, shared document/canvas projections over the same block graph, and test coverage for migrations/serialization.

## Themes

| Theme | Description |
|-------|-------------|
| **LANCER** *(default)* | Sci-fi mecha aesthetic — amber/cyan accents, monospace terminal fonts, deep blue-black backgrounds |
| **Dark Fantasy** | High-fantasy aesthetic — gold accents, serif brand font, deep purple-black backgrounds |

The theme contract now has two layers:

1. **Flavor tokens** inside each `[data-theme="..."]` block in `src/themes/themes.css`
2. **Semantic tokens** defined once in `:root` and consumed everywhere else

The semantic contract is the source of truth for custom UI:

- `--theme-app-background`
- `--theme-panel`
- `--theme-surface-elevated`
- `--theme-border`
- `--theme-text`
- `--theme-text-muted`
- `--theme-accent`
- `--theme-accent-muted`
- `--theme-danger`
- `--theme-focus-ring`
- `--theme-radius`
- `--theme-shadow-elevated`

Those tokens are used by:

- the app shell styles in `src/App.css`
- the shared primitives in `src/primitives/primitives.css`
- Lexical document surfaces in `src/components/LexicalDocumentEditor.tsx` / `src/App.css`
- tldraw theme overrides in `src/components/Editor.tsx` / `src/App.css`

Adding a new theme requires only two steps:
1. Add a `[data-theme="my-theme"]` block to `src/themes/themes.css` mapping the flavor tokens
2. Add a `{ id, label, shortLabel, appearance }` entry to the `THEMES` array in `src/themes/index.ts`

## Shared primitives

Custom UI behavior and accessibility now go through a small internal primitives layer in `src/primitives/`:

- `Button` / `IconButton`
- `ToggleGroup`
- `Collapsible`
- `DropdownMenu`
- `AlertDialog`
- `Input`
- `Tooltip`

Feature components should prefer composing these primitives rather than using Radix directly. This keeps focus, hover, active, disabled, and overlay states aligned with the shared semantic theme tokens.

## Shared page structure

The app defines a shared page-content schema intended to back both document and canvas rendering modes. Today, that schema is used for page metadata normalization and future compatibility seams; it is not yet the sole persisted source of truth for both editors.

- **Page metadata**: stable page identity, title, mode, category membership, ordering metadata, tags, pinning, grouping, custom fields, and asset references
- **Blocks**: meaningful document/content units that drag-and-drop editing can reorder, annotate, pin, and attach asset/mechanics metadata to
- **Entities**: named records referenced by blocks or canvas objects
- **Relations**: stable references between blocks and/or entities
- **Assets**: renderer-agnostic file/image/PDF records that can be referenced from pages and blocks

This shared model lives in `src/lib/document-pages.ts` and is persisted alongside page content metadata in `src/lib/document.ts`.

- Lexical currently uses Yjs/Hocuspocus as its live document state and syncs top-level blocks into `PageContentModel` for canonical persistence.
- Canvas currently uses tldraw's own persisted state keyed by page id.
- Categories remain one organizational projection, and their presentation metadata is persisted on each category record instead of being inferred from category ids in generic UI helpers.
- `src/lib/block-registry.ts` defines the initial renderer-agnostic block registry seam for Lexical nodes and markdown behavior, with future hooks for canvas projection and richer block metadata.

## Getting Started

```bash
npm install
npm run hocuspocus:dev
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

The editor connects to `ws://127.0.0.1:1234` by default.

Environment variables:

- `HOCUSPOCUS_HOST` and `HOCUSPOCUS_PORT` configure the local collaboration server
- `HOCUSPOCUS_DB_PATH` overrides the SQLite file used by the local collaboration server
- `HOCUSPOCUS_TOKEN` enables simple token auth on the server
- `VITE_HOCUSPOCUS_URL` points the web app at a different Hocuspocus endpoint
- `VITE_HOCUSPOCUS_TOKEN` sends the matching client token when auth is enabled

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Document editor | [Lexical](https://lexical.dev/) + Markdown + Yjs collaboration |
| Canvas | [tldraw](https://tldraw.dev/) |
| Data / CRDT | Yjs + Hocuspocus + `y-indexeddb` |
| Icons | [lucide-react](https://lucide.dev/) |
| UI framework | React 18 + TypeScript |
| Build tool | Vite 5 |

## Collaboration

The Lexical document layer uses [Yjs](https://github.com/yjs/yjs) as the CRDT model, synchronizes through
Hocuspocus, persists shared state in a local SQLite database, and keeps a local `y-indexeddb` cache for
offline continuity.

For local development, run the collaboration server and Vite app in separate terminals:

```bash
npm run hocuspocus:dev
npm run dev
```

Each document page uses its page id as the Hocuspocus room name.

The default local SQLite database is stored at `.data/hocuspocus.sqlite`.
