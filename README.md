# LITD — Collaborative Knowledge Workspace

A collaborative knowledge workspace powered by [Lexical](https://lexical.dev/) and [tldraw](https://tldraw.dev/).

## Features

- **Rich document editing** via Lexical with canonical page-model reconciliation
- **Freeform canvas mode** via tldraw with per-page local persistence
- **Generic sidebar collections** with stored category metadata and page membership
- **Editable workspace branding** for the shell title/subtitle plus document/canvas labels and badges
- **Seeded generic workspace collections**:
  - Notes · Research · People · Spaces · Projects
- **Create, rename, and remove collections** plus create new pages in any collection
- **Collaboration infrastructure** using Yjs, Hocuspocus, and IndexedDB persistence helpers
- **Two built-in themes** with an instant switcher in the sidebar footer
- **Lucide icons** throughout — no emoji

## Current Status

This repo is partway through the broader "general knowledge workspace" plan.

- Implemented today: generic shell vocabulary, seeded non-TTRPG collections, workspace/mode branding, category metadata persistence, a normalized shared page-content schema, and an initial block-registry seam for Lexical.
- Partially implemented: document-mode top-level Lexical blocks now sync into `PageContentModel` with stable block ids plus metadata-preserving reconciliation. Canvas still persists its own tldraw state by page id, and collaboration session helpers exist but are not yet mounted by the current document editor surface.
- Not implemented yet: active mounted document collaboration, room seeding/authority rules, asset library UI/storage flows, PDF rendering/embed modes, pinned block surfaces, mechanics-aware blocks, faceted retrieval UX, shared document/canvas projections over the same block graph, and broader migration/collaboration test coverage.

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

The app defines a shared page-content schema intended to back both document and canvas rendering modes. Today, that schema is the canonical persisted model for document pages and the future compatibility seam for canvas.

- **Page metadata**: stable page identity, title, mode, category membership, ordering metadata, tags, pinning, grouping, custom fields, and asset references
- **Blocks**: meaningful document/content units that drag-and-drop editing can reorder, annotate, pin, and attach asset/mechanics metadata to
- **Entities**: named records referenced by blocks or canvas objects
- **Relations**: stable references between blocks and/or entities
- **Assets**: renderer-agnostic file/image/PDF records that can be referenced from pages and blocks

This shared model lives in `src/lib/document-pages.ts` and is persisted alongside page content metadata in `src/lib/document.ts`.

- Lexical currently projects top-level document blocks into `PageContentModel` for canonical persistence, preserving stable block ids and metadata for matched blocks across normal edits.
- Canvas currently uses tldraw's own persisted state keyed by page id and is still a transitional local-only path.
- Categories remain one organizational projection, and their presentation metadata is persisted on each category record instead of being inferred from category ids in generic UI helpers.
- `src/lib/block-registry.ts` defines the initial renderer-agnostic block registry seam for Lexical nodes and markdown behavior, with future hooks for canvas projection and richer block metadata.

See `docs/architecture-sync.md` for the current sync contract and `docs/development-sync.md` for contributor guidance.

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

## Collaboration status

The repository includes [Yjs](https://github.com/yjs/yjs), Hocuspocus, and `y-indexeddb` collaboration helpers, plus a local Hocuspocus server for development.

For local development, run the collaboration server and Vite app in separate terminals:

```bash
npm run hocuspocus:dev
npm run dev
```

Each document page uses its page id as the Hocuspocus room name when a collaboration session is created.

The default local SQLite database is stored at `.data/hocuspocus.sqlite`.

Today, the mounted document editor still persists through canonical page snapshots rather than an active collaborative room. Until the editor integration is completed, local storage and canonical page snapshots are the real document authority in the running app, while canvas state and workspace shell metadata remain local-only.
