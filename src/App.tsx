import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  BookOpen,
  ChevronRight,
  ClipboardList,
  Fingerprint,
  FlaskConical,
  Ghost,
  LayoutDashboard,
  ScanLine,
} from 'lucide-react';
import { Overview } from './Overview';
import { Evidence } from './Evidence';
import { Repair } from './Repair';
import { Report } from './Report';
import { Guide } from './Guide';
import type { Check } from './engine';
import type { Exhibit } from './scenario';
import { loadSession, storeSession } from './session';

const nav = [
  { id: 'incident', name: 'Incident room', icon: LayoutDashboard },
  { id: 'evidence', name: 'Evidence', icon: Fingerprint },
  { id: 'repair', name: 'Repair lab', icon: FlaskConical },
  { id: 'report', name: 'Shift report', icon: ClipboardList },
] as const;
type Page = (typeof nav)[number]['id'];
function readPage(): Page {
  return nav.find((n) => '#' + n.id === location.hash)?.id ?? 'incident';
}

export default function App() {
  const [session, setSession] = useState(loadSession);
  const [page, setPage] = useState<Page>(readPage);
  const [exhibit, setExhibit] = useState<Exhibit>('source');
  const [guide, setGuide] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checks, setChecks] = useState<Check[]>(() => session.receipt?.checks ?? []);
  const [error, setError] = useState('');
  const running = useRef(false);
  const main = useRef<HTMLElement>(null);
  const guideOpener = useRef<HTMLElement | null>(null);
  const receipt = session.receipt;
  useEffect(() => {
    storeSession(session);
  }, [session]);
  useEffect(() => {
    const change = () => {
      setPage(readPage());
      window.scrollTo(0, 0);
      requestAnimationFrame(() => main.current?.focus({ preventScroll: true }));
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  const go = (id: Page) => {
    if (page !== id) location.hash = id;
  };
  function seeEvidence(id: Exhibit) {
    setExhibit(id);
    go('evidence');
  }
  function openGuide() {
    guideOpener.current = document.activeElement as HTMLElement;
    setGuide(true);
  }
  function closeGuide() {
    setGuide(false);
    requestAnimationFrame(() => guideOpener.current?.focus());
  }
  function edit(draft: string) {
    if (running.current) return;
    setSession((s) => ({ ...s, draft, receipt: null }));
    setError('');
    setChecks([]);
  }
  async function run(verify: boolean) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError('');
    const sql = session.draft;
    setSession((s) => ({ ...s, attempts: s.attempts + 1 }));
    try {
      const { runProjection } = await import('./engine');
      const results = await runProjection(sql, verify);
      setChecks(results);
      if (verify || !results.every((c) => c.passed)) {
        const proof =
          verify && results.every((c) => c.passed)
            ? { sql, verifiedAt: new Date().toISOString(), checks: results }
            : null;
        setSession((s) => (s.draft === sql ? { ...s, receipt: proof } : s));
      }
    } catch (err) {
      setChecks([]);
      setSession((s) => ({ ...s, receipt: null }));
      setError(err instanceof Error ? err.message : 'The SQL run could not finish. Try again.');
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="app-shell">
      <a
        href="#content"
        className="skip"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="topbar">
        <div className="top-inner">
          <a className="brand" href="#incident" aria-label="Graveyard Shift incident room">
            <span className="brand-mark">
              <Ghost size={22} strokeWidth={2.5} />
            </span>
            <span>Graveyard Shift</span>
          </a>
          <nav aria-label="Main navigation">
            {nav.map(({ id, name, icon: Icon }) => (
              <a
                className={page === id ? 'current' : ''}
                aria-current={page === id ? 'page' : undefined}
                key={id}
                href={'#' + id}
              >
                <Icon size={16} />
                {name}
              </a>
            ))}
          </nav>
          <button className="guide-button" onClick={openGuide}>
            <BookOpen size={16} />
            <span>Field guide</span>
          </button>
        </div>
      </header>
      <main id="content" ref={main} tabIndex={-1} className="shell">
        <div className="breadcrumb">
          <span>
            <ScanLine size={14} />
            Training console
            <ChevronRight size={13} />
            <b>Case GS-001</b>
          </span>
          <span className={`system-status ${receipt ? 'healthy' : ''}`}>
            <i />
            {receipt ? 'Case closed' : 'On shift'}
          </span>
        </div>
        {page === 'incident' && (
          <Overview receipt={receipt} onEvidence={seeEvidence} onReport={() => go('report')} />
        )}
        {page === 'evidence' && (
          <Evidence
            active={exhibit}
            onSelect={setExhibit}
            pins={session.pins}
            onPin={(id) =>
              setSession((s) => ({
                ...s,
                pins: s.pins.includes(id) ? s.pins.filter((x) => x !== id) : [...s.pins, id],
              }))
            }
            onRepair={() => go('repair')}
          />
        )}
        {page === 'repair' && (
          <Repair
            draft={session.draft}
            onEdit={edit}
            onRun={run}
            busy={busy}
            checks={checks}
            error={error}
            verified={!!receipt}
            onReport={() => go('report')}
            onGuide={openGuide}
          />
        )}
        {page === 'report' && <Report session={session} onRepair={() => go('repair')} />}
      </main>
      <footer className="shell footer">
        <span>
          <Activity size={14} />
          Graveyard Shift
        </span>
        <span>Synthetic training data · GS-001</span>
      </footer>
      {guide && (
        <Guide
          count={session.hints}
          close={closeGuide}
          inspect={(id) => {
            setGuide(false);
            seeEvidence(id);
          }}
          reveal={() => setSession((s) => ({ ...s, hints: Math.min(3, s.hints + 1) }))}
        />
      )}
    </div>
  );
}
