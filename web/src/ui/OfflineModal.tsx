import { store } from '../state/store';
import type { OfflineReport } from '../state/store';
import { money } from './format';

export function OfflineModal({ report }: { report: OfflineReport }) {
  return (
    <div className="modal-backdrop" onClick={() => store.dismissOffline()}>
      <div className="modal offline" onClick={(e) => e.stopPropagation()}>
        <span className="lesson-tag">💤 While you were away</span>
        <h2>Your data center kept earning</h2>
        <p className="big-earn">+{money(report.earned)}</p>
        <p className="muted">
          {report.gameHours.toFixed(0)} simulated hours of operations. Idle income is the whole point — your
          machines work even when you don’t.
        </p>
        <button className="primary big" onClick={() => store.dismissOffline()}>
          Collect
        </button>
      </div>
    </div>
  );
}
