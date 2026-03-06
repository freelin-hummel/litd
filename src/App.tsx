import { useState, useCallback, useEffect } from 'react';
import type { DocMode } from '@blocksuite/blocks';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { EditorToolbar } from './components/EditorToolbar';
import { initWorldStore, getDocTitle } from './lib/collection';
import type { WorldStore } from './lib/collection';
import type { Doc } from '@blocksuite/store';
import type { ThemeId } from './themes';
import { DEFAULT_THEME, applyTheme } from './themes';
import './themes/themes.css';
import './App.css';

const store: WorldStore = initWorldStore();

/** Default editor mode for all new documents. */
const DEFAULT_DOC_MODE: DocMode = 'page';

function App() {
  const [, forceUpdate] = useState(0);
  const [activeDocId, setActiveDocId] = useState<string | null>(
    store.categories[0]?.docIds[0] ?? null,
  );
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);
  // Per-document editor mode: docId → DocMode
  const [docModes, setDocModes] = useState<Map<string, DocMode>>(() => new Map());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const activeDoc: Doc | null = activeDocId
    ? (store.collection.getDoc(activeDocId) ?? null)
    : null;

  const activeMode: DocMode =
    (activeDocId != null ? docModes.get(activeDocId) : undefined) ?? DEFAULT_DOC_MODE;

  const activeTitle = activeDocId ? getDocTitle(store.collection, activeDocId) : '';

  const handleSelectDoc = useCallback((docId: string) => {
    setActiveDocId(docId);
  }, []);

  const handleStoreChange = useCallback(() => {
    forceUpdate((n) => n + 1);
  }, []);

  const handleThemeSwitch = useCallback((next: ThemeId) => {
    setTheme(next);
  }, []);

  const handleModeChange = useCallback(
    (mode: DocMode) => {
      if (!activeDocId) return;
      setDocModes((prev) => new Map(prev).set(activeDocId, mode));
    },
    [activeDocId],
  );

  return (
    <div className="app">
      <Sidebar
        store={store}
        activeDocId={activeDocId}
        onSelectDoc={handleSelectDoc}
        onStoreChange={handleStoreChange}
        currentTheme={theme}
        onThemeSwitch={handleThemeSwitch}
      />
      <main className="main">
        {activeDoc && (
          <EditorToolbar
            docTitle={activeTitle}
            mode={activeMode}
            onModeChange={handleModeChange}
          />
        )}
        <Editor doc={activeDoc} mode={activeMode} />
      </main>
    </div>
  );
}

export default App;
