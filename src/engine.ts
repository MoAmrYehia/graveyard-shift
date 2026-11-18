import * as duckdb from '@duckdb/duckdb-wasm';
import workerUrl from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import wasmUrl from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import {
  amount,
  buildDeliveries,
  control,
  source,
  type Delivery,
  type Transaction,
} from './scenario';
import { validatedSql } from './sql';

type Projected = Pick<Transaction, 'transaction_id' | 'amount_fils'>;
export interface Check {
  title: string;
  inputRows: number;
  rows: number;
  expectedRows: number;
  total: number;
  expectedTotal: number;
  passed: boolean;
  detail: string;
}
let database: Promise<duckdb.AsyncDuckDB> | undefined;

function getDatabase() {
  if (!database) {
    database = (async () => {
      const worker = new Worker(workerUrl);
      const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
      try {
        await db.instantiate(wasmUrl);
        await db.open({ query: { castBigIntToDouble: true } });
        const conn = await db.connect();
        try {
          await conn.query('SET enable_external_access = false');
        } finally {
          await conn.close();
        }
        return db;
      } catch (error) {
        await db.terminate();
        throw error;
      }
    })().catch((error) => {
      database = undefined;
      throw error;
    });
  }
  return database;
}

async function project(
  conn: duckdb.AsyncDuckDBConnection,
  sql: string,
  deliveries: Delivery[],
): Promise<Projected[]> {
  await conn.query(
    'CREATE OR REPLACE TEMP TABLE deliveries (transaction_id VARCHAR, amount_fils BIGINT, batch_id VARCHAR, attempt INTEGER, arrival_seq INTEGER)',
  );
  const insert = await conn.prepare('INSERT INTO deliveries VALUES (?, ?, ?, ?, ?)');
  try {
    for (const row of deliveries) {
      await insert.query(
        row.transaction_id,
        row.amount_fils,
        row.batch_id,
        row.attempt,
        row.arrival_seq,
      );
    }
  } finally {
    await insert.close();
  }
  const description = await conn.query('DESCRIBE ' + sql);
  const columns = description.toArray();
  const names = columns
    .map((field) => field.column_name)
    .sort()
    .join(',');
  if (names !== 'amount_fils,transaction_id') {
    throw new Error('Return exactly two columns named transaction_id and amount_fils.');
  }
  const amountType = String(
    columns.find((field) => field.column_name === 'amount_fils')?.column_type,
  );
  if (!/^(?:U?(?:TINYINT|SMALLINT|INTEGER|BIGINT|HUGEINT)|DECIMAL\(\d+,0\))$/.test(amountType)) {
    throw new Error('Return amount_fils as an integer number of fils.');
  }
  // SUM(BIGINT) yields HUGEINT. Ask DuckDB for exact digits before crossing into JavaScript.
  const result = await conn.query(
    'SELECT transaction_id, CAST(amount_fils AS VARCHAR) AS digits FROM (' + sql + ') AS projected',
  );
  return result.toArray().map((row) => {
    const id = row.transaction_id;
    const digits = row.digits;
    const fils = Number(digits);
    if (
      typeof id !== 'string' ||
      typeof digits !== 'string' ||
      !/^\d+$/.test(digits) ||
      !Number.isSafeInteger(fils)
    ) {
      throw new Error(
        'Return a transaction ID and a nonnegative integer amount in fils for each row.',
      );
    }
    return { transaction_id: id, amount_fils: fils };
  });
}

function compare(title: string, inputRows: number, rows: Projected[], truth: Transaction[]): Check {
  const known = new Map(truth.map((row) => [row.transaction_id, row.amount_fils]));
  const seen = new Set<string>();
  let duplicate = 0,
    different = 0;
  for (const row of rows) {
    if (seen.has(row.transaction_id)) duplicate++;
    if (known.get(row.transaction_id) !== row.amount_fils) different++;
    seen.add(row.transaction_id);
  }
  const missing = truth.filter((row) => !seen.has(row.transaction_id)).length;
  const passed = duplicate === 0 && different === 0 && missing === 0;
  const issues = [
    duplicate && `${duplicate} repeated row${duplicate === 1 ? '' : 's'}`,
    missing && `${missing} missing transaction${missing === 1 ? '' : 's'}`,
    different && `${different} unexpected ID or amount pair${different === 1 ? '' : 's'}`,
  ].filter(Boolean);
  return {
    title,
    inputRows,
    rows: rows.length,
    expectedRows: truth.length,
    total: amount(rows),
    expectedTotal: amount(truth),
    passed,
    detail: passed ? 'Every transaction ID and amount matches the source.' : issues.join(' · '),
  };
}

export async function runProjection(draft: string, verify: boolean): Promise<Check[]> {
  const sql = validatedSql(draft);
  const db = await getDatabase();
  const conn = await db.connect();
  const probes = [{ title: 'Original incident', retries: 0, controlRow: false }];
  if (verify)
    probes.push(
      { title: 'Two more deliveries of B-019', retries: 2, controlRow: false },
      { title: 'A new transaction on a retry', retries: 2, controlRow: true },
    );
  try {
    const checks: Check[] = [];
    for (const probe of probes) {
      const input = buildDeliveries(probe.retries, probe.controlRow);
      const result = await project(conn, sql, input);
      const truth = probe.controlRow ? [...source, control] : source;
      checks.push(compare(probe.title, input.length, result, truth));
    }
    return checks;
  } finally {
    await conn.close();
  }
}
