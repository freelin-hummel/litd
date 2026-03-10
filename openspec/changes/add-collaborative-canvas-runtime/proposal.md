## Why

Canvas pages currently depend on tldraw local persistence keyed by page id, with canonical snapshots acting only as checkpoints and recovery seeds. That leaves canvas mode outside the collaborative model that already exists for document pages.

This change makes canvas mode truly shared so collaborators see the same live canvas state, while retaining canonical checkpoints for recovery and renderer switching.

## What Changes

- add collaborative runtime state for canvas-mode pages
- seed empty canvas rooms from canonical canvas checkpoints once
- keep canonical page checkpoints updated from the shared canvas runtime
- define sync status, conflict, and recovery rules for canvas mode

## Impact

- removes a major collaborative gap between document mode and canvas mode
- preserves the current checkpoint bridge into `PageContentModel`
- creates a cleaner path toward a shared block graph across document and canvas renderers