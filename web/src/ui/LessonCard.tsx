import { LESSONS_BY_ID } from '../data/lessons';
import type { GameState, PnL } from '../engine/types';
import { store } from '../state/store';

/**
 * A milestone lesson modal. Body copy is chosen by difficulty and its
 * {placeholders} are filled with the player's live numbers so the concept lands
 * against what they just experienced.
 */
export function LessonCard({ lessonId, state, pnl }: { lessonId: string; state: GameState; pnl: PnL }) {
  const lesson = LESSONS_BY_ID[lessonId];
  if (!lesson) return null;

  const body = fill(state.difficulty === 'realistic' ? lesson.bodyRealistic : lesson.bodyEasy, pnl);

  return (
    <div className="modal-backdrop" onClick={() => store.dismissLesson()}>
      <div className="modal lesson" onClick={(e) => e.stopPropagation()}>
        <span className="lesson-tag">🎓 Business 101 · {lesson.concept}</span>
        <h2>{lesson.title}</h2>
        <p>{body}</p>
        <button className="primary big" onClick={() => store.dismissLesson()}>
          Got it
        </button>
      </div>
    </div>
  );
}

function fill(template: string, pnl: PnL): string {
  return template
    .replace('{grossMargin}', pnl.grossMarginPct.toFixed(0))
    .replace('{utilization}', (pnl.utilization * 100).toFixed(0))
    .replace('{pue}', pnl.pue.toFixed(2));
}
