import { useState, useRef, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { EditorToolbar } from './components/EditorToolbar';
import { initWorldStore, getPageTitle, getPage, setPageMode } from './lib/collection';
import type { WorldStore } from './lib/collection';
import type { EditorMode } from './lib/document-pages';
import type { ThemeId } from './themes';
import { DEFAULT_THEME, applyTheme } from './themes';
import './themes/themes.css';
import './primitives/primitives.css';
import './App.css';

const store: WorldStore = initWorldStore();

/** Default editor mode for all new documents. */
const DEFAULT_DOC_MODE: EditorMode = 'document';

function App() {
  const [, forceUpdate] = useState(0);
  const [activePageId, setActivePageId] = useState<string | null>(
    store.categories[0]?.pageIds[0] ?? null,
  );
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);
  // Keep a ref so the storeChange callback can always read the latest value.
  const activePageIdRef = useRef<string | null>(activePageId);
  activePageIdRef.current = activePageId;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const activePage = activePageId ? getPage(store, activePageId) : null;

  const activeMode: EditorMode = activePage?.mode ?? DEFAULT_DOC_MODE;

  const activeTitle = activePageId ? getPageTitle(store, activePageId) : '';

  const handleSelectPage = useCallback((pageId: string) => {
    setActivePageId(pageId);
  }, []);

  const handleStoreChange = useCallback(() => {
    // If the previously active doc has been removed from all categories, clear it
    // and fall back to the first available doc (first category, first entry).
    const allPageIds = new Set(store.categories.flatMap((c) => c.pageIds));
    if (activePageIdRef.current !== null && !allPageIds.has(activePageIdRef.current)) {
      setActivePageId(store.categories.flatMap((c) => c.pageIds)[0] ?? null);
    }
    forceUpdate((n) => n + 1);
  }, []);

  const handleThemeSwitch = useCallback((next: ThemeId) => {
    setTheme(next);
  }, []);

  const handleModeChange = useCallback(
    (mode: EditorMode) => {
      if (!activePageId) return;
      setPageMode(store, activePageId, mode);
      forceUpdate((n) => n + 1);
    },
    [activePageId],
  );

  return (
    <div className="app">
      <Sidebar
        store={store}
        activePageId={activePageId}
        onSelectPage={handleSelectPage}
        onStoreChange={handleStoreChange}
        currentTheme={theme}
        onThemeSwitch={handleThemeSwitch}
      />
      <main className="main">
        {activePage && (
          <EditorToolbar
            pageTitle={activeTitle}
            mode={activeMode}
            onModeChange={handleModeChange}
          />
        )}
        <Editor page={activePage} theme={theme} />
      </main>
    </div>
  );
}

export default App;
