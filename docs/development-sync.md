# Development Sync Notes

Use these rules when changing sync-sensitive code.

## Document block identity

- `src/lib/block-identity.ts` owns stable block id helpers for the document projection layer.
- Do not derive canonical block ids from array position.
- When reconciling editor output, preserve the existing block id for matched blocks and generate a new id only for genuinely new blocks.
- If you encounter a legacy positional id, migrate it to a stable id while preserving metadata and references.

## Document projection changes

- `src/lib/document-editor.ts` is the boundary between Lexical and `PageContentModel`.
- Keep Lexical-specific data inside `block.props.lexicalNode`.
- Preserve `metadata`, `entityIds`, `childIds`, and any non-Lexical block props for matched blocks.
- If you add a new top-level block behavior, extend the reconciliation tests in `src/lib/document-editor.test.ts`.

## Required test coverage for document sync changes

At minimum, keep coverage for:

- stable ids after text edits
- stable ids after reordering where deterministic matching is possible
- metadata preservation across edits
- deletion cleanup
- canonical → Lexical → canonical round-trips without drift
- legacy positional id migration

## Current local-vs-shared boundaries

- Document canonical snapshots are persisted with page data.
- Workspace shell metadata and canvas scene data are still local-only.
- Collaboration helpers exist, but document-mode collaboration mounting is still a follow-on task, so documentation and code changes must not imply active remote sync unless that integration is actually added.
