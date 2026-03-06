import { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { initWorldStore } from './lib/collection';
import type { WorldStore } from './lib/collection';
import type { Doc } from '@blocksuite/store';
import type { ThemeId } from './themes';
import { DEFAULT_THEME, applyTheme } from './themes';
import './themes/themes.css';
import './App.css';

const store: WorldStore = initWorldStore();

function App() {
  const [, forceUpdate] = useState(0);
  const [activeDocId, setActiveDocId] = useState<string | null>(
    store.categories[0]?.docIds[0] ?? null,
  );
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);

  // Apply theme to <html> on mount and on change
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const activeDoc: Doc | null = activeDocId
    ? (store.collection.getDoc(activeDocId) ?? null)
    : null;

  const handleSelectDoc = useCallback((docId: string) => {
    setActiveDocId(docId);
  }, []);

  const handleStoreChange = useCallback(() => {
    forceUpdate((n) => n + 1);
  }, []);

  const handleThemeSwitch = useCallback((next: ThemeId) => {
    setTheme(next);
  }, []);

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
        <Editor doc={activeDoc} />
      </main>
    </div>
  );
}

export default App;
