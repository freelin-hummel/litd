## 1. Canonical PDF model

- [ ] Define canonical PDF asset metadata and structured target metadata for full-document, page-range, and page-region references.
- [ ] Decide how top-level PDF pages resolve to a source PDF asset and initial target.

## 2. PDF surface rendering

- [ ] Add top-level PDF page behavior and navigation expectations.
- [ ] Add embedded PDF rendering behavior for document mode and canvas card mode.

## 3. Deep linking and targeting

- [ ] Define stable deep-link behavior from every PDF surface back to the source PDF asset and target section.
- [ ] Define normalized coordinate and page-range rules so page-region and page-subset references are durable.

## 4. Verification

- [ ] Add tests or acceptance coverage for full-document, page-range, and page-region PDF references.
- [ ] Add coverage that document embeds and board cards preserve the same link-back behavior.