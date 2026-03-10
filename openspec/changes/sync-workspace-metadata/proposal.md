## Why

Workspace shell metadata is editable today, but it is still browser-local. Category presentation metadata is also stored locally, which means two clients looking at the same workspace can disagree about the workspace title, mode labels, collection icons, and collection naming. That mismatch weakens the idea of a shared workspace even when page content is collaborative.

This change makes workspace-level presentation metadata shared state so every client renders the same shell vocabulary and collection presentation.

## What Changes

- add a shared workspace metadata channel for workspace title, subtitle, and mode presentation labels
- add shared category definition records for category labels, singular labels, icons, ordering, and membership presentation metadata
- make local browser snapshots fallback caches instead of the authority for workspace metadata
- update the workspace spec to define shared shell metadata behavior and conflict rules

## Impact

- aligns the sidebar and editor chrome across collaborating clients
- removes a major source of local-only divergence from the product surface
- creates the foundation needed for reliable shared navigation and future retrieval features