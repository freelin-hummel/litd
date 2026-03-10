## ADDED Requirements

### Requirement: Load PDFs as first-class workspace content
The system SHALL allow a PDF asset to be loaded and presented as its own top-level workspace page.

#### Scenario: Open a top-level PDF page
- **GIVEN** a workspace contains a PDF asset
- **WHEN** a user opens a page that targets that PDF asset as its primary content
- **THEN** the workspace loads the PDF as the page's main content surface
- **AND** the page retains a canonical link to the source PDF asset

#### Scenario: Restore a top-level PDF page to the same target
- **GIVEN** a top-level PDF page stores an initial page or viewport target
- **WHEN** the user reopens that page
- **THEN** the workspace restores the PDF page using the stored target metadata

### Requirement: Embed full PDFs and targeted PDF sections
The system SHALL allow a PDF asset to be embedded as a full document, a subset of pages, or a selected page region.

#### Scenario: Embed a full PDF document
- **GIVEN** a document block or board card references a PDF asset in full-document mode
- **WHEN** the embed renders
- **THEN** the workspace displays the full PDF document in the embedding surface
- **AND** the embed retains a canonical reference to the source PDF asset

#### Scenario: Embed a subset of PDF pages
- **GIVEN** a document block or board card references a PDF asset with a selected page range
- **WHEN** the embed renders
- **THEN** the workspace displays only the targeted subset of pages
- **AND** the embed retains the selected page range as canonical target metadata

#### Scenario: Embed a selected region from a PDF page
- **GIVEN** a document block or board card references a PDF asset with a targeted page region
- **WHEN** the embed renders
- **THEN** the workspace displays only the selected region of the targeted page
- **AND** the embed retains canonical region metadata that can reopen the same selection

### Requirement: Deep link every PDF surface to its source section
The system SHALL preserve a link from each PDF surface back to the source PDF asset and the appropriate section within it.

#### Scenario: Link back from a full-document PDF embed
- **GIVEN** a user is viewing a full-document PDF embed
- **WHEN** the user opens the source PDF from that embed
- **THEN** the workspace opens the linked PDF asset in its source page context

#### Scenario: Link back from a page-range PDF embed
- **GIVEN** a user is viewing a page-range PDF embed
- **WHEN** the user opens the source PDF from that embed
- **THEN** the workspace opens the linked PDF asset at the first page of the targeted range
- **AND** the target metadata preserves the selected range

#### Scenario: Link back from a page-region PDF embed
- **GIVEN** a user is viewing a page-region PDF embed
- **WHEN** the user opens the source PDF from that embed
- **THEN** the workspace opens the linked PDF asset at the targeted page and region

### Requirement: Render embedded PDFs consistently in boards
The system SHALL allow embedded PDF references to render as cards in board/canvas mode with the same targeting behavior as document embeds.

#### Scenario: Render a full-document PDF as a board card
- **GIVEN** a board card references a PDF asset in full-document mode
- **WHEN** the card renders on the board
- **THEN** the card displays the same full-document PDF targeting behavior available in document mode

#### Scenario: Render targeted PDF sections as board cards
- **GIVEN** a board card references a PDF asset as a page-range or page-region target
- **WHEN** the card renders on the board
- **THEN** the card displays the targeted PDF section
- **AND** the card preserves the same link-back behavior as the corresponding document embed