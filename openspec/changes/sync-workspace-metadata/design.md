## Overview

Introduce a dedicated shared workspace metadata document alongside the existing per-page collaborative documents. The shared metadata document owns workspace branding and category definitions, while canonical page records continue to own page identity and page-level metadata.

## Goals

- make workspace branding consistent across clients
- make category definitions consistent across clients
- preserve offline/local resilience without allowing stale local state to overwrite newer shared state
- keep document body collaboration behavior unchanged

## Non-Goals

- changing the existing page-body collaboration room model
- introducing user accounts or per-user personalization
- implementing faceted retrieval or asset workflows

## Proposed Model

Create a shared workspace metadata record with two domains:

1. workspace shell metadata
2. category definitions

Workspace shell metadata includes:

- title
- subtitle
- document mode label, sidebar meta, badge label
- canvas mode label, sidebar meta, badge label

Category definitions include:

- id
- label
- singular `newLabel`
- icon
- sort order
- category-level tags, pinning, custom fields, asset ids, and grouping metadata

Page membership remains represented canonically on each page record through `categoryIds`. The shared category definitions provide the labels, icons, and ordering needed to render those memberships consistently.

## Sync Topology

- add a single shared collaboration document for workspace metadata
- continue using per-page collaboration rooms for page-level editor state
- bootstrap the shared metadata document from canonical local state when the shared room is empty
- once shared state exists, treat it as the source of truth over browser-local snapshots

## Persistence And Authority

Authority order for workspace metadata becomes:

1. active shared workspace metadata room state
2. local collaborative cache for that metadata room
3. canonical local snapshot used only for first-open seeding and recovery
4. browser-local storage must not silently overwrite newer shared state

Local storage remains useful as a fallback snapshot and offline cache, but not as the primary authority once shared metadata exists.

## Integration Notes

- `collection.ts` should stop treating `litd:workspace` and `litd:categories` as authoritative after shared metadata is enabled
- category rendering in the sidebar should read from the shared category definitions plus canonical page memberships
- workspace branding edits should write through the shared metadata document and then update local snapshots
- normalization rules for empty badge/sidebar labels should still apply before persistence

## Risks

- category ordering may drift if local category arrays and canonical page memberships are migrated inconsistently
- bootstrapping must avoid reseeding the shared metadata room on every client start
- existing local-only data must migrate without losing user-edited labels or icons

## Validation

- two clients see the same workspace title and mode labels after one client edits them
- category labels and icons converge across clients
- an empty shared metadata room seeds once from existing local metadata
- stale local snapshots do not overwrite newer shared metadata after reconnect