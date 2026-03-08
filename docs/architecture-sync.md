# Sync Architecture

This document defines the repository's current sync contract and the transitional boundaries that still need follow-on work.

## Canonical model

- **Canonical page content model:** `PageContentModel` in `src/lib/document-pages.ts`
- **Canonical page identity:** `page.id`
- **Canonical page metadata:** `page.title`, `page.mode`, `page.categoryIds`, `page.sortIndex`, and `page.metadata`
- **Canonical document blocks:** `blocks` + `rootBlockIds`
- **Stable content identity:** page, block, entity, relation, and asset ids are durable string ids and must never be derived from array position alone

## Renderer projections

### Document mode

- **Renderer:** Lexical
- **Projection module:** `src/lib/document-editor.ts`
- **Current authority:** Lexical edits are reconciled into `PageContentModel`
- **Current block identity rule:** top-level document blocks carry stable ids and reconciliation preserves ids, metadata, entity references, and extra block props for matched blocks
- **Deletion rule:** removing a top-level Lexical block removes that canonical root block record; unrelated non-root block records are preserved

### Canvas mode

- **Renderer:** tldraw
- **Current authority:** local tldraw persistence keyed by page id
- **Status:** transitional; canvas state is not yet projected into `PageContentModel`

## Persistence boundaries

- **Shared canonical page snapshot:** persisted with each document page through the document storage layer
- **Workspace shell metadata:** currently local-only browser persistence
- **Canvas scene state:** currently local-only browser persistence
- **Collaboration transport:** Hocuspocus/Yjs session helpers exist in `src/lib/document.ts` and `src/lib/collection.ts`, but the current document editor surface is not yet mounted onto that runtime

## Conflict and authority rules

The app must behave deterministically when multiple persistence layers exist.

### Implemented today

1. `PageContentModel` is the persisted canonical snapshot for document content.
2. Lexical is a projection that reads from and writes back into that canonical snapshot.
3. Local-only workspace shell and canvas state must not silently overwrite canonical document blocks.

### Transitional gaps

1. Active remote collaboration state is not yet the mounted runtime authority for document editing.
2. Room seeding and remote-vs-local precedence are not yet enforced in the UI integration.
3. Canvas content still lives outside the canonical model.

## Migration rules

- Legacy positional block ids such as `lexical-block:0` are migrated to stable block ids on the next document reconciliation cycle.
- Canonical block metadata is preserved for matched blocks during that migration.
- Legacy markdown-only persisted fields are ignored during page normalization in favor of the canonical page model.

## Versioning policy

- `PAGE_CONTENT_SCHEMA_VERSION` tracks the stored `PageContentModel` schema version.
- Normalization must remain backward-compatible with previously persisted data.
- Future schema changes must add explicit migrations rather than relying on implicit runtime behavior.

## Metadata ownership

- **Shared with the page model today:** title, mode, category ids, sort index, tags, pinning, grouping, custom fields, and asset ids
- **Local-only today:** workspace shell branding and category presentation metadata
- **Transitional:** canvas scene data and collaboration session state

## Acceptance criteria for the current document sync seam

The current document projection is considered healthy when all of the following remain true:

- block ids remain stable after ordinary text edits
- block ids remain stable when top-level blocks reorder and the content can be matched deterministically
- matched blocks keep metadata, entity ids, and extra props
- deleted top-level blocks are removed cleanly
- canonical content can reconstruct a Lexical editor state deterministically
- repeated canonical → Lexical → canonical cycles do not drift
