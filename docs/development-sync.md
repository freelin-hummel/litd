# Development sync workflows

## Running the app and collaboration server

```bash
npm install
npm run hocuspocus:dev
npm run dev
```

Open two browser tabs to the same document page id to verify realtime document sync.

## Inspecting sync status

Document mode exposes:

- connection / sync state
- offline-cache fallback state
- awareness-based collaborator count

Development-only logs use grep-friendly prefixes:

- `[litd:sync:collaboration]`
- `[litd:sync:document]`
- `[litd:sync:migration]`

## Testing seeding behavior

To verify deterministic room seeding:

1. Open a document page that already has canonical content.
2. Confirm the first time you open it seeds the room.
3. Reload the page.
4. Confirm the room is reused instead of reseeded.

The seed marker is stored inside the Yjs document metadata map.

## Clearing persistence layers separately

### Clear collaborative IndexedDB cache only

Use the browser devtools Application tab and remove the IndexedDB database used by `y-indexeddb`.

### Clear local app shell state only

Remove the relevant localStorage keys:

- `litd:docs`
- `litd:categories`
- `litd:workspace`

### Reset local canvas state only

Remove the relevant `litd:tldraw:<pageId>` local storage entry.

Canvas pages now also mirror a canonical snapshot checkpoint into `litd:docs`, so clearing
local tldraw state without clearing the docs store should cause an empty canvas to reseed from
the canonical checkpoint on the next open.

## Extending document sync safely

When adding or changing document blocks:

1. Keep `PageContentModel` canonical.
2. Preserve existing block ids whenever a block still represents the same logical unit.
3. Preserve existing `metadata` and `entityIds` for matched blocks.
4. Add or update migration coverage if persistence format changes.
5. Add round-trip tests for canonical → editor → canonical stability.

## Required test coverage for sync-related changes

At minimum, sync changes should validate:

- block id stability across edits
- metadata preservation
- clean deletion behavior
- canonical reconstruction of Lexical state
- collaboration seeding rules
- status mapping or lifecycle behavior when applicable
