import { ArrowRight, ClipboardList, Download, Pin, ShieldCheck } from 'lucide-react';
import { exhibits, formatAed, initialTotal } from './scenario';
import { makeReport, type Session } from './session';
import { CheckList } from './Repair';

export function Report({ session, onRepair }: { session: Session; onRepair: () => void }) {
  const proof = session.receipt;
  function download() {
    const blob = new Blob([makeReport(session)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'GS-001-shift-report.md';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">GS-001 / HANDOVER</span>
          <h1>Shift report</h1>
          <p>
            {proof
              ? 'The ledger reconciles and the repair has passed every replay check.'
              : 'The report opens for export once the repair passes every replay check.'}
          </p>
        </div>
        {proof && (
          <button className="primary" onClick={download}>
            <Download size={16} />
            Export report
          </button>
        )}
      </div>
      {proof ? (
        <div className="report-grid">
          <section className="panel">
            <div className="panel-title">
              <h2>
                <ShieldCheck size={18} />
                Recovery verified
              </h2>
            </div>
            <p className="panel-desc">
              Batch B-019 committed before its acknowledgement timed out. The warehouse counted its
              retry twice.
            </p>
            <div className="report-balance">
              <small>Ledger at alert</small>
              <strong>AED {formatAed(initialTotal)}</strong>
              <small>After repair</small>
              <strong className="mint-text">AED {formatAed(proof.checks[0].total)}</strong>
            </div>
            <div className="section-label">Verified SQL</div>
            <pre className="sql-preview">{proof.sql}</pre>
            <div className="muted report-time">
              Verified {new Date(proof.verifiedAt).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC
            </div>
          </section>
          <section className="panel">
            <div className="panel-title">
              <h2>Replay evidence</h2>
            </div>
            <CheckList checks={proof.checks} />
          </section>
        </div>
      ) : (
        <div className="panel report-pending">
          <ClipboardList size={30} />
          <div>
            <h2>Verification pending</h2>
            <p>Test the original incident, replay the batch and preserve the late transaction.</p>
          </div>
          <button className="secondary" onClick={onRepair}>
            Open repair lab
            <ArrowRight size={16} />
          </button>
        </div>
      )}
      <div className="panel handover">
        <h2>
          <Pin size={16} />
          Pinned evidence
        </h2>
        {session.pins.length ? (
          <ul>
            {session.pins.map((id) => (
              <li key={id}>
                {exhibits[id].ref} · {exhibits[id].name}
              </li>
            ))}
          </ul>
        ) : (
          <p>Pin exhibits in the evidence locker to include them here.</p>
        )}
        <div className="mono muted">
          {session.attempts} SQL runs · {session.hints} clues opened
        </div>
      </div>
    </>
  );
}
