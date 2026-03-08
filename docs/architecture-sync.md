# Sync architecture contract

## Canonical model

- `PageContentModel` is the canonical persisted content model for every page.
- Page identity, page metadata, blocks, entities, relations, and assets all live inside that canonical model.
- Lexical is a projection over canonical document blocks.
- tldraw is still transitional and local-only today; its runtime is **not** yet the canonical shared canvas model.

## Ownership by domain

### Shared page metadata

The canonical page record owns:

- `id`
- `title`
- `mode`
- `categoryIds`
- `sortIndex`
- page-level tags / pinning / custom fields / asset ids / grouping

### Collaborative page content

Document-mode body content is collaborative in realtime:

- top-level Lexical blocks projected into canonical `blocks`
- canonical `rootBlockIds`
- block metadata and entity ids for matched blocks
- block relations that remain valid after reconciliation

### Local-only today

These remain local browser state for now:

- workspace title / subtitle
- workspace mode labels and badges
- category presentation metadata
- tldraw page runtime state
- theme and other UI preferences

## Projection boundaries

### Lexical ⇄ canonical content

- `src/lib/document-editor.ts` projects Lexical serialized top-level nodes into canonical blocks.
- Stable block ids are never position-derived.
- Matching uses deterministic reconciliation:
  1. exact lexical-node match
  2. same-index same-type match for ordinary edits
  3. structural same-type match when unique
  4. otherwise a new stable block id

Matched blocks preserve:

- `id`
- `entityIds`
- `metadata`
- surviving relation references

Deleted blocks are removed from `blocks` / `rootBlockIds`, and dangling relations are pruned.

### Canvas ⇄ canonical content

- Canvas is still transitional, but it is no longer completely outside the canonical model.
- `src/lib/canvas-projection.ts` mirrors a tldraw store snapshot into a canonical `tldraw.snapshot` block.
- The live runtime still uses tldraw local persistence keyed by page id.
- When a canvas opens and the local runtime is empty, the canonical snapshot is used as a deterministic seed/checkpoint.
- Document reconciliation preserves non-Lexical blocks, so switching renderers does not silently delete the stored canvas snapshot.

## Persistence boundaries and authority

Document collaboration uses this authority ladder:

1. active Hocuspocus room state
2. local `y-indexeddb` collaborative cache
3. canonical `PageContentModel` snapshot used for deterministic seeding / recovery
4. local browser storage never silently overwrites newer collaborative room state

Workspace shell persistence is intentionally separate from collaborative document content.

## Collaboration lifecycle

Document-mode editor behavior:

- acquires a cached collaboration session on mount
- connects Lexical to the session through `CollaborationPlugin`
- tracks provider status and awareness count in the UI
- releases the collaboration session on unmount / page switch

## Room seeding rules

When a document room opens:

1. If the Yjs room already has content, use that content.
2. If the room is empty and canonical content exists, bootstrap from canonical content once.
3. A Yjs seed marker records that the room was seeded, so reopening the same empty room does not repeatedly reseed.

## Conflict rules

- Remote collaborative state wins over stale local browser snapshots.
- Local canonical snapshots are only used to seed an empty room or recover when no collaborative state exists.
- Canonical document content is updated from Lexical after local and remote collaborative changes settle into editor state.

## Versioning and migrations

- `src/lib/page-content-migrations.ts` owns canonical page-content migrations.
- Current schema version: `2`.
- Migration v2 replaces legacy positional block ids (`lexical-block:<index>`) with durable stable ids and rewrites dependent references.
- Normalization always runs after migration.

## Acceptance criteria implemented by this repo

A document page is considered correctly synced when:

- Lexical collaboration is active in document mode
- empty rooms seed from canonical content exactly once
- populated rooms are not clobbered by local snapshots
- top-level document block ids remain stable through normal edits and reorder of unchanged blocks
- block metadata survives ordinary edits
- canonical content can reconstruct Lexical state deterministically
- deleted blocks do not leave dangling canonical relations

## Known transitional gaps

- Canvas mode is not yet realtime collaborative
- Workspace shell metadata is still local-only
- Shared page metadata beyond the document body is persisted canonically but is not yet transported collaboratively through Yjs
