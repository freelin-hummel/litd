## Overview

Extend the collaboration architecture so canvas-mode pages use shared runtime state instead of browser-local tldraw persistence. The collaborative room for a canvas page becomes the runtime authority, while canonical `PageContentModel` canvas blocks remain the durable checkpoint and seeding format.

## Goals

- make canvas edits visible to all connected clients in realtime
- preserve deterministic recovery from canonical checkpoints
- keep mode switching safe so canvas data is not lost when switching renderers
- align canvas authority rules with the existing document collaboration model

## Non-Goals

- redesigning the page-content schema into a full renderer-neutral live block graph in this change
- implementing asset embedding or PDF rendering
- changing document-mode collaboration semantics

## Proposed Model

For each canvas-mode page:

- use a shared collaboration session keyed by page id
- treat the collaborative canvas room as the live runtime source of truth
- continue mirroring a canonical `tldraw.snapshot` block into `PageContentModel`
- seed a newly empty collaborative room from the canonical checkpoint once

## Authority Rules

Canvas mode authority becomes:

1. active shared canvas room state
2. local collaborative cache for that canvas room
3. canonical `PageContentModel` snapshot for one-time seeding and recovery
4. browser-local tldraw persistence must not overwrite newer shared room state

This mirrors the document authority ladder and removes the current browser-local runtime from the top of the stack.

## Integration Notes

- replace or disable `persistenceKey`-driven local-only tldraw authority in `Editor.tsx`
- add canvas collaboration session lifecycle management similar to document collaboration session management
- update canvas status UI so connection and sync state are visible in canvas mode as well
- preserve the existing canonical checkpoint debounce behavior, but derive it from shared runtime updates

## Migration Strategy

- on first open, if a shared canvas room is empty and a canonical checkpoint exists, seed from the checkpoint once
- if old browser-local canvas state exists but no shared room state exists, reconcile it through the same bootstrap path instead of letting it silently override shared state later
- once shared canvas state exists, future opens should restore from the shared room or local collaborative cache before using canonical snapshots

## Risks

- tldraw integration may require adapter code to map collaborative updates cleanly into the editor store
- room seeding must avoid duplicate bootstrap writes
- status handling may diverge from document mode if canvas lifecycle events are not normalized

## Validation

- two clients see the same canvas edits in realtime
- an empty canvas room seeds from the canonical checkpoint exactly once
- stale browser-local runtime state does not overwrite newer shared canvas room state
- canonical checkpoints continue to update after shared canvas edits settle