import { useState } from 'react';

function App() {
  const [mode, setMode] = useState<'story' | 'dev'>('story');

  return (
    <div>
      <h1>Chronicle</h1>
      <button onClick={() => setMode('story')}>Story Mode</button>
      <button onClick={() => setMode('dev')}>Developer Mode</button>

      {mode === 'story' ? <StoryView /> : <DevView />}
    </div>
  );
}

function StoryView() {
  return <div>📝 Story Mode UI here</div>;
}

function DevView() {
  return (
    <div>
      🔍 Developer Mode
      <input type="text" placeholder="e.g. How did I fix auth bug?" />
    </div>
  );
}

export default App;
