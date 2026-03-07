# LITD — Collaborative TTRPG Worldbuilder

A collaborative tabletop RPG worldbuilding application powered by [TipTap](https://tiptap.dev/) and [tldraw](https://tldraw.dev/).

## Features

- **Rich document editing** via TipTap with Yjs-backed collaborative document state
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
| Document editor | [TipTap](https://tiptap.dev/) + StarterKit + Collaboration |
| Canvas | [tldraw](https://tldraw.dev/) |
| Data / CRDT | Yjs + `y-indexeddb` |
| Icons | [lucide-react](https://lucide.dev/) |
| UI framework | React 18 + TypeScript |
| Build tool | Vite 5 |

## Adding Real-Time Collaboration

TipTap's collaboration extension is built on top of [Yjs](https://github.com/yjs/yjs) CRDTs. To enable
live multi-user sync, attach a Hocuspocus or Yjs provider to the document returned by
`getCollaborationDoc(docId)`:

```ts
import { HocuspocusProvider } from '@hocuspocus/provider';
import { getCollaborationDoc } from './src/lib/collection';

const provider = new HocuspocusProvider({
  url: 'wss://your-server.example.com',
  name: 'litd-room',
  document: getCollaborationDoc(docId),
});
```
