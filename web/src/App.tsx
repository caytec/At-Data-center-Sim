import { useState } from 'react';
import { useGame } from './state/useGame';
import { BuildPanel } from './ui/BuildPanel';
import { Codex } from './ui/Codex';
import { Dashboard } from './ui/Dashboard';
import { Leaderboard } from './ui/Leaderboard';
import { LessonCard } from './ui/LessonCard';
import { OfflineModal } from './ui/OfflineModal';
import { Onboarding } from './ui/Onboarding';
import { TopBar } from './ui/TopBar';

type Tab = 'build' | 'ranks' | 'learn';

export default function App() {
  const snap = useGame();
  const [tab, setTab] = useState<Tab>('build');

  if (!snap.state || !snap.pnl) {
    return <Onboarding />;
  }

  const lessonId = snap.pendingLessons[0] ?? null;

  return (
    <div className="app">
      <TopBar state={snap.state} pnl={snap.pnl} online={snap.online} />

      <main className="content">
        <Dashboard state={snap.state} pnl={snap.pnl} demand={snap.demand} />

        <nav className="tabs" role="tablist">
          <button className={tab === 'build' ? 'tab active' : 'tab'} onClick={() => setTab('build')}>
            🏗️ Build
          </button>
          <button className={tab === 'ranks' ? 'tab active' : 'tab'} onClick={() => setTab('ranks')}>
            🏆 Ranks
          </button>
          <button className={tab === 'learn' ? 'tab active' : 'tab'} onClick={() => setTab('learn')}>
            🎓 Learn
          </button>
        </nav>

        {tab === 'build' && <BuildPanel state={snap.state} pnl={snap.pnl} />}
        {tab === 'ranks' && <Leaderboard handle={snap.state.handle} />}
        {tab === 'learn' && <Codex seen={snap.state.seenLessons} difficulty={snap.state.difficulty} />}
      </main>

      {snap.offline && <OfflineModal report={snap.offline} />}
      {lessonId && <LessonCard lessonId={lessonId} state={snap.state} pnl={snap.pnl} />}
    </div>
  );
}
