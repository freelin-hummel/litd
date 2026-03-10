# Workspace Specification

## Purpose
Describe the current core behavior of the LITD workspace so future OpenSpec changes can propose deltas against a concrete baseline.

## Requirements

### Requirement: Shared document editing
The system SHALL provide collaborative editing for document-mode pages through the shared Yjs and Hocuspocus runtime.

#### Scenario: Open a document room with existing shared state
- **GIVEN** a document-mode page already has collaborative room content
- **WHEN** a user opens that page in the editor
- **THEN** the editor uses the existing room state as the live document source of truth

#### Scenario: Seed an empty room from canonical page content
- **GIVEN** a document-mode page has canonical `PageContentModel` content and its collaborative room is empty
- **WHEN** a user opens the page
- **THEN** the editor seeds the room once from the canonical document content
- **AND** future edits sync through the collaborative room

### Requirement: Canonical page content checkpoints
The system SHALL persist a canonical `PageContentModel` snapshot for each page even when the active editor runtime differs by mode.

#### Scenario: Save document content into the canonical model
- **GIVEN** a user edits a document-mode page
- **WHEN** collaborative updates are reconciled
- **THEN** the document blocks are normalized into the page's canonical `PageContentModel`

#### Scenario: Mirror canvas state into the canonical model
- **GIVEN** a user edits a canvas-mode page
- **WHEN** the canvas runtime produces a checkpoint snapshot
- **THEN** the page stores a canonical tldraw snapshot block in `PageContentModel`

### Requirement: Category-organized workspace pages
The system SHALL organize workspace pages through editable categories that preserve presentation metadata and page membership.

#### Scenario: Create a page inside a category
- **GIVEN** a workspace category exists in the sidebar
- **WHEN** a user creates a new page in that category
- **THEN** the new page is added to that category's page list
- **AND** the workspace selects the new page

#### Scenario: Persist category presentation metadata
- **GIVEN** a category has a custom label or icon metadata
- **WHEN** the workspace reloads from local storage
- **THEN** the category retains its saved presentation metadata

### Requirement: Local workspace branding persistence
The system SHALL allow local editing of workspace branding metadata and restore it from browser storage on reload.

#### Scenario: Update workspace branding locally
- **GIVEN** a user edits the workspace title, subtitle, or mode labels in the sidebar
- **WHEN** the branding changes are saved
- **THEN** the workspace shell and editor chrome show the updated branding metadata

#### Scenario: Restore saved workspace branding on reload
- **GIVEN** a workspace has saved branding metadata in local storage
- **WHEN** the workspace reloads in the same browser
- **THEN** the workspace restores the saved title, subtitle, and mode presentation labels

#### Scenario: Normalize blank branding meta labels to defaults
- **GIVEN** a user clears a mode sidebar meta label or badge label while editing workspace branding
- **WHEN** the branding changes are saved
- **THEN** the workspace restores the corresponding default label instead of persisting an empty UI label

### Requirement: Local canvas runtime checkpoint recovery
The system SHALL keep canvas-mode pages locally persistent while mirroring deterministic checkpoints into canonical page content.

#### Scenario: Mirror local canvas edits into a canonical checkpoint
- **GIVEN** a user edits a canvas-mode page
- **WHEN** the tldraw runtime produces a debounced local save
- **THEN** the page stores an updated canonical tldraw snapshot block in `PageContentModel`

#### Scenario: Seed an empty local canvas from a canonical checkpoint
- **GIVEN** a canvas-mode page has a canonical tldraw snapshot block and no local runtime state for that page id
- **WHEN** the user opens the page
- **THEN** the editor loads the canonical snapshot into the empty canvas runtime
