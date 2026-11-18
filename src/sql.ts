// Repairs are single-table projections over a fixed teaching dataset.
const vocabulary = new Set(
  (
    'select distinct from deliveries transaction_id amount_fils batch_id attempt arrival_seq ' +
    'where and or by group order asc desc qualify row_number over partition as min max sum count'
  ).split(' '),
);

export function validatedSql(sql: string): string {
  const statement = sql.trim().replace(/;$/, '').trim();
  const tokens = statement.match(/[a-z_][a-z_0-9]*|\d+|<=|>=|<>|!=|[(),=*<>]|\S/gi) ?? [];
  const words = tokens.map((token) => token.toLowerCase());
  const from = words.indexOf('from');
  if (
    sql.length > 2000 ||
    words.length > 120 ||
    words[0] !== 'select' ||
    words.lastIndexOf('select') !== 0 ||
    from < 2 ||
    words.lastIndexOf('from') !== from ||
    words[from + 1] !== 'deliveries' ||
    words.filter((word) => word === 'deliveries').length !== 1
  ) {
    throw new Error(
      'Use one SELECT from deliveries with transaction_id and amount_fils as output columns.',
    );
  }
  for (const word of words) {
    if (!vocabulary.has(word) && !/^(?:\d{1,10}|<=|>=|<>|!=|[(),=*<>])$/.test(word)) {
      throw new Error(
        'The lab supports a single-table SELECT with DISTINCT, WHERE, GROUP BY or QUALIFY. Check the SQL reference.',
      );
    }
  }
  return tokens.join(' ');
}
