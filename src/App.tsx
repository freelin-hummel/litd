import { useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { initWorldStore } from './lib/collection';
import type { WorldStore } from './lib/collection';
import type { Doc } from '@blocksuite/store';
import './App.css';

const store: WorldStore = initWorldStore();

function App() {
  const [, forceUpdate] = useState(0);
  const [activeDocId, setActiveDocId] = useState<string | null>(
    store.categories[0]?.docIds[0] ?? null,
  );

  const activeDoc: Doc | null = activeDocId
    ? (store.collection.getDoc(activeDocId) ?? null)
    : null;

  const handleSelectDoc = useCallback((docId: string) => {
    setActiveDocId(docId);
  }, []);

  const handleStoreChange = useCallback(() => {
    forceUpdate((n) => n + 1);
  }, []);

  return (
    <div className="app">
      <Sidebar
        store={store}
        activeDocId={activeDocId}
        onSelectDoc={handleSelectDoc}
        onStoreChange={handleStoreChange}
      />
      <main className="main">
        <Editor doc={activeDoc} />
      </main>
    </div>
  );
}

export default App;
