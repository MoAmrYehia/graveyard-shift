export const CASE_VERSION = 'gs001-v1';
export type Exhibit = 'source' | 'dispatch' | 'warehouse';
export const exhibitIds: Exhibit[] = ['source', 'dispatch', 'warehouse'];
export const exhibits = {
  source: {
    ref: 'E-01',
    name: 'Source manifest',
    description: 'Original settlement instructions and their signed amounts.',
  },
  dispatch: {
    ref: 'E-02',
    name: 'Delivery journal',
    description: 'Batch acknowledgements, retries and their arrival times.',
  },
  warehouse: {
    ref: 'E-03',
    name: 'Warehouse ledger',
    description: 'Every row published by the loader at the time of the alert.',
  },
} satisfies Record<Exhibit, { ref: string; name: string; description: string }>;

export interface Transaction {
  transaction_id: string;
  amount_fils: number;
  batch_id: string;
}
export interface Delivery extends Transaction {
  arrival_seq: number;
  attempt: number;
}
export interface Dispatch {
  batch: string;
  attempt: number;
  time: string;
  ack: boolean;
}
export const source: Transaction[] = [
  ['TX-1101', 3_000_000, 'B-017'],
  ['TX-1102', 2_000_000, 'B-017'],
  ['TX-1103', 1_500_000, 'B-017'],
  ['TX-1104', 1_000_000, 'B-018'],
  ['TX-1105', 500_000, 'B-018'],
  ['TX-1106', 1_000_000, 'B-019'],
  ['TX-1107', 600_000, 'B-019'],
  ['TX-1108', 400_000, 'B-019'],
].map(([id, aed, batch]) => ({
  transaction_id: String(id),
  amount_fils: Number(aed) * 100,
  batch_id: String(batch),
}));

export const dispatches: Dispatch[] = [
  { batch: 'B-017', attempt: 1, time: '02:07', ack: true },
  { batch: 'B-018', attempt: 1, time: '02:11', ack: true },
  { batch: 'B-019', attempt: 1, time: '02:14', ack: false },
  { batch: 'B-019', attempt: 2, time: '02:17', ack: true },
];
export const retryBatch = 'B-019';
export const control: Transaction = {
  transaction_id: 'TX-1109',
  amount_fils: 60_000_000,
  batch_id: retryBatch,
};
export const amount = (rows: ReadonlyArray<{ amount_fils: number }>) =>
  rows.reduce((sum, row) => sum + row.amount_fils, 0);
export const formatAed = (fils: number) =>
  new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: fils % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(fils / 100);

function deliver(rows: Transaction[], batch: string, attempt: number, offset: number): Delivery[] {
  return rows
    .filter((row) => row.batch_id === batch)
    .map((row, i) => ({ ...row, attempt, arrival_seq: offset + i + 1 }));
}
export function buildDeliveries(extraRetries = 0, withControl = false): Delivery[] {
  const rows: Delivery[] = [];
  for (const run of dispatches) {
    const manifest =
      withControl && run.batch === retryBatch && run.attempt > 1 ? [...source, control] : source;
    rows.push(...deliver(manifest, run.batch, run.attempt, rows.length));
  }
  for (let i = 0; i < extraRetries; i++) {
    rows.push(
      ...deliver(withControl ? [...source, control] : source, retryBatch, 3 + i, rows.length),
    );
  }
  return rows;
}
export const initialRows = buildDeliveries();
export const sourceTotal = amount(source);
export const initialTotal = amount(initialRows);
export const variance = initialTotal - sourceTotal;
export const ledgerTrace = dispatches.map((run, i) => {
  const seen = new Set(dispatches.slice(0, i + 1).map((d) => d.batch));
  const previous = dispatches.slice(0, i + 1);
  const settled = amount(source.filter((row) => seen.has(row.batch_id)));
  const published = previous.reduce(
    (total, d) => total + amount(source.filter((row) => row.batch_id === d.batch)),
    0,
  );
  return { time: run.time, source: settled, ledger: published };
});
export const starterSql = 'SELECT transaction_id, amount_fils\nFROM deliveries;';
export const references = [
  {
    title: 'Compare the two ledgers',
    exhibit: 'source' as Exhibit,
    text: 'The manifest lists each original instruction once. Compare its count and total with the warehouse rows.',
  },
  {
    title: 'Follow the acknowledgement',
    exhibit: 'dispatch' as Exhibit,
    text: 'Batch B-019 committed at 02:14 UTC, but its acknowledgement timed out. Compare it with the next delivery.',
  },
  {
    title: 'Choose a durable identity',
    exhibit: 'warehouse' as Exhibit,
    text: 'Delivery order and attempt can change during retries. Group copies by transaction_id and preserve amount_fils. Two different transactions can have the same amount.',
  },
];
