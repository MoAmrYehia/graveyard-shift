import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, ChevronRight, X } from 'lucide-react';
import { exhibits, references, type Exhibit } from './scenario';

interface Props {
  count: number;
  reveal: () => void;
  inspect: (id: Exhibit) => void;
  close: () => void;
}
export function Guide({ count, reveal, inspect, close }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [answer, setAnswer] = useState('');
  const [working, setWorking] = useState(false);
  const live = import.meta.env.VITE_LIVE_MENTOR === 'true';
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  async function explain() {
    setWorking(true);
    setAnswer('');
    try {
      const resp = await fetch(import.meta.env.BASE_URL + 'api/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exhibit: references[count - 1].exhibit }),
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok) throw new Error('mentor');
      const body = await resp.json();
      if (typeof body.answer !== 'string' || !body.answer.trim()) throw new Error('mentor');
      setAnswer(body.answer);
    } catch {
      setAnswer(
        'The live mentor is unavailable. The field guide clues above are available locally.',
      );
    } finally {
      setWorking(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="guide-title"
      onCancel={close}
      onClick={(e) => {
        if (e.target === dialog.current) close();
      }}
    >
      <div className="dialog-content">
        <div className="panel-title">
          <h2 id="guide-title">
            <BookOpen size={20} />
            Field guide
          </h2>
          <button className="icon-button" aria-label="Close field guide" onClick={close}>
            <X size={18} />
          </button>
        </div>
        <p>Open one clue at a time. Each clue points to a record you can inspect.</p>
        <div className="clues">
          {references.slice(0, count).map((hint, i) => (
            <section key={hint.exhibit}>
              <small>CLUE 0{i + 1}</small>
              <h3>{hint.title}</h3>
              <p>{hint.text}</p>
              <button className="text-button" onClick={() => inspect(hint.exhibit)}>
                {exhibits[hint.exhibit].ref} · Inspect record
                <ArrowRight size={13} />
              </button>
            </section>
          ))}
        </div>
        {count < references.length && (
          <button
            className="primary"
            onClick={() => {
              setAnswer('');
              reveal();
            }}
          >
            Reveal clue {count + 1}
            <ChevronRight size={16} />
          </button>
        )}
        {live && count > 0 && (
          <div className="mentor">
            <button className="secondary" disabled={working} onClick={explain}>
              {working ? 'Requesting explanation…' : 'Ask the live AI mentor'}
            </button>
            {answer && <p role="status">{answer}</p>}
          </div>
        )}
      </div>
    </dialog>
  );
}
