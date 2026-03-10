## ADDED Requirements

### Requirement: Shared workspace branding metadata
The system SHALL synchronize workspace branding metadata across clients through shared workspace state.

#### Scenario: Propagate branding edits to other clients
- **GIVEN** two clients are connected to the same workspace
- **WHEN** one client updates the workspace title, subtitle, or mode presentation labels
- **THEN** the other client receives the updated branding metadata through shared workspace state
- **AND** the workspace shell and editor chrome render the same labels on both clients

#### Scenario: Recover branding from shared state before local snapshots
- **GIVEN** a client has stale local workspace branding snapshots
- **AND** the shared workspace metadata already contains newer branding values
- **WHEN** the client reconnects to the workspace
- **THEN** the client restores the branding from shared state
- **AND** the stale local snapshots do not overwrite the newer shared values

### Requirement: Shared category presentation metadata
The system SHALL synchronize category definitions and presentation metadata across clients.

#### Scenario: Propagate category label and icon changes
- **GIVEN** two clients are connected to the same workspace
- **WHEN** one client updates a category label, singular label, or icon metadata
- **THEN** the other client receives the updated category definition
- **AND** both clients render the same category presentation in the sidebar

#### Scenario: Seed an empty shared metadata room from local workspace state
- **GIVEN** a workspace has existing local workspace and category metadata
- **AND** the shared workspace metadata room is empty
- **WHEN** the first client opens the workspace
- **THEN** the client seeds the shared metadata room once from the existing local metadata
- **AND** later clients reuse the shared metadata instead of reseeding it