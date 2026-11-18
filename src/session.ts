import type { Check } from './engine';
import {
  CASE_VERSION,
  exhibitIds,
  exhibits,
  formatAed,
  initialTotal,
  initialRows,
  source,
  sourceTotal,
  starterSql,
  type Exhibit,
} from './scenario';

export interface Receipt {
  sql: string;
  verifiedAt: string;
  checks: Check[];
}
export interface Session {
  draft: string;
  pins: Exhibit[];
  hints: number;
  attempts: number;
  receipt: Receipt | null;
}
const key = `graveyard-shift/${CASE_VERSION}`;
export function freshSession(): Session {
  return { draft: starterSql, pins: [], hints: 0, attempts: 0, receipt: null };
}
export function loadSession(): Session {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (!saved || typeof saved.draft !== 'string') return freshSession();
    const receipt = saved.receipt;
    const verified =
      receipt &&
      receipt.sql === saved.draft &&
      typeof receipt.verifiedAt === 'string' &&
      !Number.isNaN(Date.parse(receipt.verifiedAt)) &&
      Array.isArray(receipt.checks) &&
      receipt.checks.length === 3 &&
      receipt.checks.every(
        (c: Check) =>
          c.passed === true &&
          typeof c.title === 'string' &&
          [c.rows, c.total, c.expectedRows, c.expectedTotal, c.inputRows].every(
            Number.isSafeInteger,
          ),
      );
    return {
      draft: saved.draft.slice(0, 2000),
      pins: exhibitIds.filter((id) => saved.pins?.includes(id)),
      hints: Number.isInteger(saved.hints) ? Math.max(0, Math.min(3, saved.hints)) : 0,
      attempts: Number.isSafeInteger(saved.attempts) ? Math.max(0, saved.attempts) : 0,
      receipt: verified ? receipt : null,
    };
  } catch {
    return freshSession();
  }
}
export function storeSession(session: Session) {
  try {
    localStorage.setItem(key, JSON.stringify(session));
  } catch {
    /* Current tab remains playable. */
  }
}
export function makeReport(session: Session): string {
  const receipt = session.receipt;
  if (!receipt) throw new Error('Verify the repair before exporting a handover.');
  return [
    '# Graveyard Shift | Incident GS-001',
    '',
    '## The Doppelgänger',
    '',
    `Verified at ${receipt.verifiedAt}. All amounts are synthetic.`,
    '',
    `Source: AED ${formatAed(sourceTotal)} (${source.length} transactions).`,
    `At alert: AED ${formatAed(initialTotal)} (${initialRows.length} warehouse rows).`,
    `Recovered: AED ${formatAed(receipt.checks[0].total)} (${receipt.checks[0].rows} transactions).`,
    '',
    '## Finding',
    '',
    'B-019 committed before its acknowledgement timed out. The loader appended the retry as new transactions.',
    '',
    '## Pinned evidence',
    '',
    ...(session.pins.length
      ? session.pins.map((id) => `- ${exhibits[id].ref} | ${exhibits[id].name}`)
      : ['No exhibits pinned.']),
    '',
    '## Verified SQL',
    '',
    '~~~sql',
    receipt.sql,
    '~~~',
    '',
    '## Replay results',
    '',
    ...receipt.checks.map(
      (c) =>
        `- PASS | ${c.title} | ${c.inputRows} input rows → ${c.rows} transactions | AED ${formatAed(c.total)} | ${c.detail}`,
    ),
    '',
    `SQL runs: ${session.attempts}. Field guide clues opened: ${session.hints}.`,
    '',
  ].join('\n');
}
