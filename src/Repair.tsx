import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  CircleAlert,
  Code2,
  Play,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { formatAed, starterSql } from './scenario';
import type { Check as Result } from './engine';

export function CheckList({ checks }: { checks: Result[] }) {
  return (
    <div className="checks">
      {checks.map((check) => (
        <div className={`check-row ${check.passed ? 'ok' : 'failed'}`} key={check.title}>
          {check.passed ? <ShieldCheck size={19} /> : <CircleAlert size={19} />}
          <div>
            <strong>{check.title}</strong>
            <p>{check.detail}</p>
            <small>
              {check.inputRows} input rows → {check.rows} output · AED {formatAed(check.total)}
            </small>
            {!check.passed && (
              <small>
                Expected {check.expectedRows} transactions · AED {formatAed(check.expectedTotal)}
              </small>
            )}
          </div>
          <span className="check-status">{check.passed ? 'PASS' : 'FAIL'}</span>
        </div>
      ))}
    </div>
  );
}
interface Props {
  draft: string;
  onEdit: (s: string) => void;
  onRun: (verify: boolean) => void;
  checks: Result[];
  busy: boolean;
  error: string;
  onReport: () => void;
  onGuide: () => void;
  verified: boolean;
}
export function Repair({
  draft,
  onEdit,
  onRun,
  checks,
  busy,
  error,
  onReport,
  onGuide,
  verified,
}: Props) {
  const [reference, setReference] = useState(false);
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">GS-001 / DUCKDB</span>
          <h1>Repair lab</h1>
          <p>
            Write a ledger projection. Test it, then verify the same repair against repeated and
            late deliveries.
          </p>
        </div>
      </div>
      <div className="lab-grid">
        <section className="panel lab-panel">
          <div className="panel-title">
            <h2>
              <Code2 size={18} />
              Ledger projection
            </h2>
            <span className="mono muted">SQL</span>
          </div>
          <label className="section-label" htmlFor="sql">
            Query over <code>deliveries</code>
          </label>
          <div className="editor">
            <div aria-hidden="true" className="line-numbers">
              {draft.split('\n').map((_, i) => (
                <span key={i}>{String(i + 1).padStart(2, '0')}</span>
              ))}
            </div>
            <textarea
              id="sql"
              aria-label="Repair SQL"
              disabled={busy}
              maxLength={2000}
              value={draft}
              spellCheck={false}
              autoCapitalize="off"
              onChange={(e) => onEdit(e.target.value)}
            />
          </div>
          <div className="editor-bottom">
            <button
              className="text-button"
              disabled={busy || draft === starterSql}
              onClick={() => onEdit(starterSql)}
            >
              <RotateCcw size={13} />
              Restore starter
            </button>
            <button
              className="text-button"
              aria-expanded={reference}
              onClick={() => setReference(!reference)}
            >
              <BookOpen size={14} />
              SQL reference
            </button>
          </div>
          {reference && (
            <div className="reference">
              <strong>Available columns</strong>
              <code>transaction_id · amount_fils · batch_id · attempt · arrival_seq</code>
              <p>
                Return transaction_id and amount_fils. Use a single SELECT with DISTINCT, GROUP BY,
                WHERE or QUALIFY. A window can number rows within each group.
              </p>
              <pre>{'QUALIFY ROW_NUMBER() OVER (\n  PARTITION BY … ORDER BY …\n) = 1'}</pre>
            </div>
          )}
          <div className="lab-actions">
            <button
              className="primary"
              disabled={busy || !draft.trim()}
              onClick={() => onRun(false)}
            >
              <Play size={15} />
              {busy ? 'Running…' : 'Run projection'}
            </button>
            <button
              className="secondary"
              disabled={busy || checks.length === 0 || !checks[0].passed}
              onClick={() => onRun(true)}
            >
              <ShieldCheck size={16} />
              Verify replay
            </button>
          </div>
          {error && (
            <div role="alert" className="error-message">
              {error}
            </div>
          )}
        </section>
        <section className="panel results-panel">
          <div className="panel-title">
            <h2>
              <ShieldCheck size={18} />
              Run results
            </h2>
          </div>
          <div aria-live="polite" aria-busy={busy}>
            {checks.length === 0 ? (
              <div className="empty-results">
                <div className="scope-mark">
                  <Play size={22} />
                </div>
                <strong>Awaiting a projection</strong>
                <p>Run the SQL to compare each transaction with the source manifest.</p>
              </div>
            ) : (
              <CheckList checks={checks} />
            )}
          </div>
          {verified && (
            <button className="small-button pinned" onClick={onReport}>
              <Check size={15} />
              Open shift report
              <ArrowRight size={14} />
            </button>
          )}
        </section>
      </div>
      <div className="hint-strip">
        <BookOpen size={17} />
        <span>Stuck on the discrepancy?</span>
        <button className="text-button" onClick={onGuide}>
          Open field guide
          <ArrowRight size={14} />
        </button>
      </div>
    </>
  );
}
