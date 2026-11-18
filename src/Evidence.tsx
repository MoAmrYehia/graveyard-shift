import { useState } from 'react';
import { ArrowRight, Check, Database, FileClock, Layers, Pin, Search } from 'lucide-react';
import {
  amount,
  dispatches,
  exhibits,
  exhibitIds,
  formatAed,
  initialRows,
  source,
  type Exhibit,
} from './scenario';

const icons = { source: Database, dispatch: FileClock, warehouse: Layers };
interface Props {
  active: Exhibit;
  onSelect: (id: Exhibit) => void;
  pins: Exhibit[];
  onPin: (id: Exhibit) => void;
  onRepair: () => void;
}
export function Evidence({ active, onSelect, pins, onPin, onRepair }: Props) {
  const [filter, setFilter] = useState('');
  const selected = exhibits[active];
  const pinned = pins.includes(active);
  const cols =
    active === 'dispatch'
      ? ['Time (UTC)', 'Batch', 'Attempt', 'Committed', 'Acknowledgement']
      : active === 'source'
        ? ['Transaction ID', 'Batch', 'Amount (AED)']
        : ['Arrival', 'Transaction ID', 'Batch', 'Attempt', 'Amount (AED)'];
  const rows: string[][] =
    active === 'dispatch'
      ? dispatches.map((d) => [
          d.time,
          d.batch,
          String(d.attempt),
          `${source.filter((r) => r.batch_id === d.batch).length} rows`,
          d.ack ? 'Received' : 'Timed out',
        ])
      : active === 'source'
        ? source.map((r) => [r.transaction_id, r.batch_id, formatAed(r.amount_fils)])
        : initialRows.map((r) => [
            String(r.arrival_seq),
            r.transaction_id,
            r.batch_id,
            String(r.attempt),
            formatAed(r.amount_fils),
          ]);
  const visible = rows.filter((row) =>
    row.join(' ').toLowerCase().includes(filter.trim().toLowerCase()),
  );
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">GS-001 / RECORDS</span>
          <h1>Evidence locker</h1>
          <p>Compare the original instructions, delivery attempts and published rows.</p>
        </div>
      </div>
      <div className="work-layout">
        <aside className="exhibit-list panel" aria-label="Choose exhibit">
          <div className="panel-title">
            <h2>Exhibits</h2>
            <span className="mono muted">03</span>
          </div>
          {exhibitIds.map((id) => {
            const Icon = icons[id];
            return (
              <button
                className={`exhibit ` + (active === id ? 'selected' : '')}
                key={id}
                aria-pressed={active === id}
                onClick={() => {
                  setFilter('');
                  onSelect(id);
                }}
              >
                <Icon size={19} />
                <span>
                  <small>{exhibits[id].ref}</small>
                  <strong>{exhibits[id].name}</strong>
                </span>
                {pins.includes(id) && <Pin size={14} aria-label="Pinned" />}
              </button>
            );
          })}
        </aside>
        <section className="panel evidence-detail">
          <div className="panel-title">
            <h2>{selected.name}</h2>
            <button
              className={`small-button ${pinned ? 'pinned' : ''}`}
              onClick={() => onPin(active)}
              aria-pressed={pinned}
            >
              {pinned ? <Check size={14} /> : <Pin size={14} />} {pinned ? 'Pinned' : 'Pin exhibit'}
            </button>
          </div>
          <p className="panel-desc">{selected.description}</p>
          <label className="filter">
            <Search size={16} />
            <input
              type="search"
              placeholder="Filter rows"
              aria-label="Filter evidence rows"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </label>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label={selected.name + ' records'}
          >
            <table>
              <thead>
                <tr>
                  {cols.map((col) => (
                    <th key={col} scope="col">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row, i) => (
                  <tr key={i}>
                    {row.map((val, j) => (
                      <td key={j} className={val === 'Timed out' ? 'warn-text' : undefined}>
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visible.length === 0 && <p className="empty">No rows match your filter.</p>}
          <div className="table-foot">
            <span>
              {visible.length} of {rows.length} records
            </span>
            {active !== 'dispatch' && (
              <span>
                Full ledger · AED {formatAed(amount(active === 'source' ? source : initialRows))}
              </span>
            )}
          </div>
        </section>
      </div>
      <div className="next-action">
        <span>{pins.length} of 3 exhibits pinned to your report</span>
        <button className="primary" onClick={onRepair}>
          Open repair lab
          <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}
