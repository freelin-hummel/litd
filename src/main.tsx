import { effects as blocksEffects } from '@blocksuite/blocks/effects';
import { effects as presetsEffects } from '@blocksuite/presets/effects';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Register ALL BlockSuite custom elements in the correct order:
// 1. blocks/effects registers editor-host, surface, paragraph, etc.
// 2. presets/effects registers affine-editor-container, page-editor, etc.
blocksEffects();
presetsEffects();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
