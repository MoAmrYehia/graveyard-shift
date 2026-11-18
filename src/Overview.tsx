import {
  Activity,
  ArrowRight,
  Check,
  CircleAlert,
  Database,
  GitMerge,
  Layers3,
  ListTree,
  Radio,
  ScanLine,
} from 'lucide-react';
import {
  dispatches,
  formatAed,
  initialRows,
  initialTotal,
  ledgerTrace,
  source,
  sourceTotal,
  type Exhibit,
} from './scenario';
import { Signal } from './Signal';
import type { Receipt } from './session';

interface Props {
  receipt: Receipt | null;
  onEvidence: (id: Exhibit) => void;
  onReport: () => void;
}
const timeLabel = (time: string) => time + ' UTC';

function Trace({ resolved }: { resolved: boolean }) {
  const max = Math.max(...ledgerTrace.map((p) => p.ledger));
  return (
    <div className="trace">
      <div className="trace-axis" aria-hidden="true">
        <span>12M</span>
        <span>6M</span>
        <span>0</span>
      </div>
      <div className="trace-plot">
        <div className="chart-grid" aria-hidden="true"></div>
        {ledgerTrace.map((point) => {
          const ledger = resolved ? point.source : point.ledger;
          return (
            <div
              key={point.time}
              className="chart-group"
              aria-label={`${timeLabel(point.time)}, source AED ${formatAed(point.source)}, warehouse AED ${formatAed(ledger)}`}
            >
              <div className="pair" aria-hidden="true">
                <span
                  className="bar source"
                  style={{ height: `${(point.source / max) * 100}%` }}
                ></span>
                <span
                  className={`bar ${resolved ? 'restored' : 'ledger'}`}
                  style={{ height: `${(ledger / max) * 100}%` }}
                ></span>
              </div>
              <span className="chart-time">{point.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Overview({ receipt, onEvidence, onReport }: Props) {
  const resolved = !!receipt;
  const total = receipt?.checks[0]?.total ?? initialTotal;
  const gap = total - sourceTotal;
  const stages = [
    {
      icon: Database,
      id: 'source' as Exhibit,
      name: 'Source manifest',
      note: `${source.length} signed transactions`,
    },
    {
      icon: GitMerge,
      id: 'dispatch' as Exhibit,
      name: 'Batch delivery',
      note: `${dispatches.length} delivery attempts`,
    },
    {
      icon: Layers3,
      id: 'warehouse' as Exhibit,
      name: 'Warehouse ledger',
      note: `${initialRows.length} rows at alert`,
    },
  ];
  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <div className={`status-chip ${resolved ? 'resolved' : ''}`}>
            {resolved ? <Check size={13} /> : <Radio size={13} />}{' '}
            {resolved ? 'Incident resolved' : 'Priority 1 incident'}
          </div>
          <h1>The Doppelgänger</h1>
          <p>
            {resolved
              ? 'The ledger reconciles. Replay verified every transaction through repeated deliveries.'
              : 'The warehouse reports AED 2 million more than the settlement source. Find where the extra money came from.'}
          </p>
          <button
            className="primary"
            onClick={() => (resolved ? onReport() : onEvidence('source'))}
          >
            {resolved ? 'View shift report' : 'Investigate incident'}
            <ArrowRight size={17} />
          </button>
        </div>
        <div className="hero-visual">
          <Signal resolved={resolved} />
        </div>
      </section>
      <div className="section-heading">
        <h2>
          <Activity size={19} />
          Reconciliation
        </h2>
        <span className="mono muted">{resolved ? 'VERIFIED REPLAY' : 'AT ALERT'} · AED</span>
      </div>
      <div className="metrics">
        <Metric
          label="Source balance"
          value={sourceTotal}
          note={`${source.length} signed transactions`}
          tone="mint"
          icon={<Database size={16} />}
        />
        <Metric
          label="Warehouse balance"
          value={total}
          note={`${receipt?.checks[0].rows ?? initialRows.length} ledger rows`}
          tone={resolved ? 'mint' : 'neutral'}
          icon={<Layers3 size={16} />}
        />
        <Metric
          label="Ledger variance"
          value={gap}
          note={
            resolved
              ? 'Source and ledger agree'
              : `${Math.round((gap / sourceTotal) * 100)}% above source`
          }
          tone={resolved ? 'mint' : 'amber'}
          icon={resolved ? <Check size={16} /> : <CircleAlert size={16} />}
          sign
        />
      </div>
      <div className="overview-lower">
        <section className="panel">
          <div className="panel-title">
            <h2>
              <ScanLine size={18} />
              Balance trace
            </h2>
            <span className="mono muted">AED · UTC</span>
          </div>
          <div className="legend">
            <span>
              <i className="key source"></i>Source
            </span>
            <span>
              <i className={`key ${resolved ? 'restored' : 'ledger'}`}></i>Warehouse
            </span>
          </div>
          <Trace resolved={resolved} />
        </section>
        <section className="panel">
          <div className="panel-title">
            <h2>
              <ListTree size={18} />
              Pipeline evidence
            </h2>
            <span className="mono muted">03 EXHIBITS</span>
          </div>
          <div className="stage-list">
            {stages.map(({ icon: Icon, id, name, note }, i) => (
              <button key={id} onClick={() => onEvidence(id)} className="stage-row">
                <span className={`stage-icon stage-${i}`}>
                  <Icon size={19} />
                </span>
                <span>
                  <strong>{name}</strong>
                  <small>{note}</small>
                </span>
                <ArrowRight className="row-arrow" size={16} />
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  note,
  tone,
  icon,
  sign = false,
}: {
  label: string;
  value: number;
  note: string;
  tone: string;
  icon: React.ReactNode;
  sign?: boolean;
}) {
  return (
    <div className={`metric ${tone}`}>
      <div className="metric-label">
        {icon}
        {label}
      </div>
      <div className="metric-value" title={`AED ${formatAed(value)}`}>
        {sign && value > 0 ? '+' : ''}
        {(value / 100_000_000).toFixed(2)}
        <span>M</span>
      </div>
      <div className="metric-note">{note}</div>
    </div>
  );
}
