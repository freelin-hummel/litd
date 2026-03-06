# LITD — Collaborative TTRPG Worldbuilder

A collaborative tabletop RPG worldbuilding application powered by [BlockSuite](https://blocksuite.io/).

## Features

- **Rich document editing** via BlockSuite's `AffineEditorContainer` (supports paragraphs, headings, lists, code blocks, tables, and more)
- **TTRPG-organised sidebar** with six worldbuilding categories:
  - Worlds · Locations · Factions · Characters · Lore & History · Bestiary
- **Create new documents** in any category with a single click
- **CRDT-backed data model** (Yjs via BlockSuite) — ready for real-time multi-user collaboration
- **Two built-in themes** with an instant switcher in the sidebar footer
- **Lucide icons** throughout — no emoji

## Themes

| Theme | Description |
|-------|-------------|
| **LANCER** *(default)* | Sci-fi mecha aesthetic — amber/cyan accents, monospace terminal fonts, deep blue-black backgrounds |
| **Dark Fantasy** | High-fantasy aesthetic — gold accents, serif brand font, deep purple-black backgrounds |

Adding a new theme requires only two steps:
1. Add a `[data-theme="my-theme"]` block to `src/themes/themes.css` overriding the CSS variable tokens
2. Add a `{ id, label, shortLabel }` entry to the `THEMES` array in `src/themes/index.ts`

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Editor | [BlockSuite](https://blocksuite.io/) `@blocksuite/presets` + `@blocksuite/blocks` |
| Data / CRDT | `@blocksuite/store` + Yjs |
| Icons | [lucide-react](https://lucide.dev/) |
| UI framework | React 18 + TypeScript |
| Build tool | Vite 5 |

## Adding Real-Time Collaboration

BlockSuite is built on top of [Yjs](https://github.com/yjs/yjs) CRDTs. To enable live multi-user
sync, attach a `y-websocket` (or `y-webrtc`) provider to the `DocCollection`'s underlying `Y.Doc`:

```ts
import { WebsocketProvider } from 'y-websocket';
import { store } from './src/lib/collection';

const wsProvider = new WebsocketProvider(
  'wss://your-server.example.com',
  'litd-room',
  store.collection.doc,
);
```
