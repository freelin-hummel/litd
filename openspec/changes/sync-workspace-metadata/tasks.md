## 1. Shared metadata model

- [ ] Define a shared workspace metadata shape and normalization path for workspace branding and category definitions.
- [ ] Add migration or bootstrap logic that can seed shared metadata once from existing local snapshots.

## 2. Collaboration plumbing

- [ ] Add a shared collaboration session for workspace metadata with explicit authority rules over local storage.
- [ ] Update store initialization and persistence flows to read and write shared metadata instead of local-only sources.

## 3. UI integration

- [ ] Route workspace branding edits through the shared metadata document.
- [ ] Render sidebar category labels, icons, and ordering from shared metadata while preserving canonical page membership behavior.

## 4. Verification

- [ ] Add tests for metadata normalization, one-time seeding, and stale local snapshot protection.
- [ ] Add integration coverage for cross-tab or cross-client workspace branding/category sync.