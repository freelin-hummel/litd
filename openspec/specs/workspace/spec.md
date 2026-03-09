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
