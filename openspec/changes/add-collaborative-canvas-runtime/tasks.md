## 1. Canvas collaboration model

- [ ] Define the collaborative canvas room lifecycle and its relationship to canonical `PageContentModel` checkpoints.
- [ ] Add one-time seeding rules for empty rooms using canonical checkpoints and any necessary seed markers.

## 2. Runtime integration

- [ ] Replace local-only canvas authority with shared runtime synchronization in the editor integration.
- [ ] Expose canvas connection and sync status in the UI.

## 3. Persistence and migration

- [ ] Update checkpoint persistence so canonical `tldraw.snapshot` blocks are derived from shared runtime state.
- [ ] Add migration/bootstrap handling for existing locally persisted canvas pages.

## 4. Verification

- [ ] Add tests for shared canvas seeding, checkpoint updates, and stale local-state protection.
- [ ] Add multi-client verification coverage for realtime canvas edits.