# LITD — Collaborative TTRPG Worldbuilder

A collaborative tabletop RPG worldbuilding application with a replaceable document-editor boundary, currently powered by [Lexical](https://lexical.dev/) for document mode and [tldraw](https://tldraw.dev/) for canvas mode.

## Features

- **Rich document editing** via Lexical with a themed editor shell and local document persistence
- **Freeform canvas mode** via tldraw for maps, diagrams, and relationship boards
- **TTRPG-organised sidebar** with six worldbuilding categories:
  - Worlds · Locations · Factions · Characters · Lore & History · Bestiary
- **Create new documents** in any category with a single click
- **CRDT-backed document model** using Yjs with IndexedDB persistence, ready for Hocuspocus-style multiplayer sync
- **Two built-in themes** with an instant switcher in the sidebar footer
- **Lucide icons** throughout — no emoji

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

## Page/editor boundary

`DocumentPage` in `src/lib/document-pages.ts` is the app-facing page contract used for page identity, title, and current mode. Sidebar selection and metadata persistence live in `src/lib/collection.ts`, so document mode and canvas mode continue to share the same page identity even though they render through different surfaces.

Document-mode content now sits behind `DocumentEditorBoundary` in `src/lib/document-editor.ts`. The current `LEXICAL_DOCUMENT_EDITOR` implementation keeps the active Lexical surface isolated in `src/components/LexicalDocumentEditor.tsx`, while `TIPTAP_DOCUMENT_EDITOR` remains available in `src/components/TipTapDocumentEditor.tsx` / `src/lib/tiptap-document-store.ts` as the legacy boundary implementation during migration work.

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

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Document editor | [Lexical](https://lexical.dev/) + `@lexical/react` |
| Canvas | [tldraw](https://tldraw.dev/) |
| Data / CRDT | Yjs + `y-indexeddb` |
| Icons | [lucide-react](https://lucide.dev/) |
| UI framework | React 18 + TypeScript |
| Build tool | Vite 5 |

## Adding Real-Time Collaboration

TipTap's collaboration extension is built on top of [Yjs](https://github.com/yjs/yjs) CRDTs. To enable
live multi-user sync for the legacy TipTap-backed boundary implementation, attach a Hocuspocus or
Yjs provider to the Y.Doc returned by `getTipTapDocument(pageId)`:

```ts
import { HocuspocusProvider } from '@hocuspocus/provider';
import { getTipTapDocument } from './src/lib/tiptap-document-store';

const provider = new HocuspocusProvider({
  url: 'wss://your-server.example.com',
  name: 'litd-room',
  document: getTipTapDocument(pageId),
});
```
