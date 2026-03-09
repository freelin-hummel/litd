# LITD — Collaborative Knowledge Workspace

A collaborative knowledge workspace powered by [Lexical](https://lexical.dev/) and [tldraw](https://tldraw.dev/).

## Features

- **Rich document editing** via Lexical projected from a canonical `PageContentModel`
- **Realtime document collaboration** via Yjs + Hocuspocus with `y-indexeddb` offline cache
- **Freeform canvas mode** via tldraw with local runtime plus canonical snapshot checkpoints
- **Generic sidebar collections** with stored category metadata and page membership
- **Editable workspace branding** for the shell title/subtitle plus document/canvas labels and badges
- **Seeded generic workspace collections**:
  - Notes · Research · People · Spaces · Projects
- **Create, rename, and remove collections** plus create new pages in any collection
- **Sync-aware document status UI** for connection, sync, offline cache, and participant count
- **Two built-in themes** with an instant switcher in the sidebar footer
- **Lucide icons** throughout — no emoji

## Current Status

This repo is partway through the broader "general knowledge workspace" plan.

- Implemented today: generic shell vocabulary, seeded non-TTRPG collections, workspace/mode branding, category metadata persistence, a normalized shared page-content schema, stable document block identities, canonical document reconciliation, and active Lexical collaboration over Yjs/Hocuspocus.
- Transitional today: canvas mode still uses tldraw's own local persistence keyed by page id, but now mirrors canonical snapshot checkpoints into `PageContentModel`; workspace shell metadata remains local-only in browser storage.
- Not implemented yet: asset library UI/storage flows, PDF rendering/embed modes, pinned block surfaces, mechanics-aware blocks, faceted retrieval UX, and a fully shared canvas runtime over the same block graph.

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

The app defines `PageContentModel` as the canonical shared page-content schema for page identity, page metadata, blocks, entities, relations, and assets.

- **Page metadata**: stable page identity, title, mode, category membership, ordering metadata, tags, pinning, grouping, custom fields, and asset references
- **Blocks**: meaningful document/content units that drag-and-drop editing can reorder, annotate, pin, and attach asset/mechanics metadata to
- **Entities**: named records referenced by blocks or canvas objects
- **Relations**: stable references between blocks and/or entities
- **Assets**: renderer-agnostic file/image/PDF records that can be referenced from pages and blocks

This shared model lives in `src/lib/document-pages.ts`, is migrated through `src/lib/page-content-migrations.ts`, and is projected into Lexical by `src/lib/document-editor.ts`.

- Lexical uses Yjs/Hocuspocus as the collaborative runtime, but `PageContentModel` remains the canonical persisted representation for document pages.
- Top-level document blocks now keep stable non-positional ids, and matched blocks preserve metadata, entity ids, and surviving relations across normal edits.
- Canvas still uses tldraw's own persisted state keyed by page id, but canvas pages now mirror a canonical tldraw snapshot block into `PageContentModel` as a checkpoint bridge.
- Categories remain one organizational projection, and their presentation metadata is persisted on each category record instead of being inferred from category ids in generic UI helpers.
- `src/lib/block-registry.ts` defines the initial renderer-agnostic block registry seam for Lexical nodes and markdown behavior, with future hooks for canvas projection and richer block metadata.

See also:

- `docs/architecture-sync.md` for the sync contract, authority ladder, and migration policy
- `docs/development-sync.md` for operational workflows and extension guidance

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

The document editor uses [Yjs](https://github.com/yjs/yjs) as the CRDT model, synchronizes through
Hocuspocus, persists shared state in a local SQLite database, and keeps a local `y-indexeddb` cache for
offline continuity.

Authority for collaborative document content is:

1. active remote room state from Hocuspocus
2. local Yjs IndexedDB cache when offline
3. canonical `PageContentModel` snapshots for first-open seeding and recovery
4. local browser storage is never allowed to silently overwrite newer collaborative room state

Room seeding rules:

- if a room already has Yjs content, the editor uses that content
- if a room is empty and canonical page content exists, Lexical seeds the room once
- a room seed marker is stored in the Yjs document so reopening the same empty room does not reseed repeatedly
- remote updates flowing through Yjs update the canonical `PageContentModel` through the Lexical projection

Metadata semantics today:

- **Collaborative/shared in realtime:** document body blocks for document-mode pages
- **Eventually consistent local snapshot:** canonical `PageContentModel` persisted in the docs store
- **Local-only today:** workspace title/subtitle, workspace mode labels, category presentation metadata, and the live tldraw runtime state
- **Canonical checkpoint today:** canvas pages mirror a tldraw snapshot into `PageContentModel`, which is used for seeding and mode-switch preservation but is not yet realtime collaborative

For local development, run the collaboration server and Vite app in separate terminals:

```bash
npm run hocuspocus:dev
npm run dev
```

Each document page uses its page id as the Hocuspocus room name when a collaboration session is created.

The default local SQLite database is stored at `.data/hocuspocus.sqlite`.
