import { useState, useRef, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { EditorToolbar } from './components/EditorToolbar';
import { initWorldStore } from './lib/collection';
import type { WorldStore, EditorMode } from './lib/collection';
import {
  getAllPageIds,
  getInitialActivePageId,
  getPage,
  setPageMode,
} from './lib/pages';
import type { ThemeId } from './themes';
import { DEFAULT_THEME, applyTheme } from './themes';
import './themes/themes.css';
import './primitives/primitives.css';
import './App.css';

const store: WorldStore = initWorldStore();

/** Default editor mode for newly created document pages. */
const DEFAULT_DOCUMENT_MODE: EditorMode = 'document';

function App() {
  const [, forceUpdate] = useState(0);
  const [activePageId, setActivePageId] = useState<string | null>(() => getInitialActivePageId(store));
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);
  // Keep a ref so the storeChange callback can always read the latest value.
  const activePageIdRef = useRef<string | null>(activePageId);
  activePageIdRef.current = activePageId;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const activePage = activePageId ? getPage(store, activePageId) : null;

  const activeMode: EditorMode = activePage?.mode ?? DEFAULT_DOCUMENT_MODE;

  const activeTitle = activePage?.title ?? '';

  const handleSelectPage = useCallback((pageId: string) => {
    setActivePageId(pageId);
  }, []);

  const handleStoreChange = useCallback(() => {
    // If the previously active page has been removed from all categories, clear it
    // and fall back to the first available page.
    const allPageIds = new Set(getAllPageIds(store));
    if (activePageIdRef.current !== null && !allPageIds.has(activePageIdRef.current)) {
      setActivePageId(getInitialActivePageId(store));
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
            docTitle={activeTitle}
            mode={activeMode}
            onModeChange={handleModeChange}
          />
        )}
        <Editor doc={activePage} theme={theme} />
      </main>
    </div>
  );
}

export default App;
