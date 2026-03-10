## ADDED Requirements

### Requirement: Shared canvas editing
The system SHALL provide collaborative editing for canvas-mode pages through shared room state.

#### Scenario: Open a canvas room with existing shared state
- **GIVEN** a canvas-mode page already has collaborative room content
- **WHEN** a user opens that page in canvas mode
- **THEN** the editor uses the existing room state as the live canvas source of truth

#### Scenario: Seed an empty canvas room from a canonical checkpoint
- **GIVEN** a canvas-mode page has a canonical tldraw checkpoint in `PageContentModel`
- **AND** its collaborative room is empty
- **WHEN** a user opens that page in canvas mode
- **THEN** the editor seeds the room once from the canonical checkpoint
- **AND** future canvas edits sync through the collaborative room

### Requirement: Canonical canvas checkpoint reconciliation
The system SHALL keep canonical canvas checkpoints synchronized with collaborative canvas runtime state.

#### Scenario: Reconcile shared canvas edits into the canonical model
- **GIVEN** a user edits a canvas-mode page in a collaborative room
- **WHEN** canvas updates are reconciled
- **THEN** the page stores an updated canonical tldraw snapshot block in `PageContentModel`

#### Scenario: Protect newer shared canvas state from stale local runtime data
- **GIVEN** a client has stale browser-local canvas state for a page
- **AND** the collaborative canvas room contains newer state
- **WHEN** the client opens the page
- **THEN** the editor restores the shared room state
- **AND** the stale local runtime data does not overwrite the newer collaborative state