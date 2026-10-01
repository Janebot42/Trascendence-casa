import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const benchmarkDatabaseUrl = process.env.BENCHMARK_DATABASE_URL;
if (!benchmarkDatabaseUrl) {
  throw new Error('Set BENCHMARK_DATABASE_URL to a dedicated local database named benchmark or benchmark_*.');
}
const benchmarkDatabase = new URL(benchmarkDatabaseUrl);
const benchmarkDatabaseName = decodeURIComponent(benchmarkDatabase.pathname.slice(1));
if (!['127.0.0.1', 'localhost', '::1'].includes(benchmarkDatabase.hostname)
  || !/^benchmark(?:_|$)/i.test(benchmarkDatabaseName)) {
  throw new Error('For safety, the benchmark only connects to a local database named benchmark or benchmark_*.');
}

const prisma = new PrismaClient({ datasources: { db: { url: benchmarkDatabaseUrl } } });
const repetitions = 5;

const scenarios = [
  {
    name: 'BoardList: boardId + archivedAt + position',
    query: `SELECT id, position FROM bench_lists
      WHERE board_id = 3625 AND archived_at IS NULL
      ORDER BY position ASC LIMIT 100`,
    redundantIndex: 'bench_lists_board_id_idx'
  },
  {
    name: 'Card: listId + archivedAt + position',
    query: `SELECT id, position FROM bench_cards
      WHERE list_id = 10874 AND archived_at IS NULL
      ORDER BY position ASC LIMIT 50`,
    redundantIndex: 'bench_cards_list_id_idx'
  },
  {
    name: 'Label: boardId + name + id',
    query: `SELECT id, name FROM bench_labels
      WHERE board_id = 3625 ORDER BY name ASC, id ASC`,
    redundantIndex: 'bench_labels_board_id_idx'
  }
];

try {
  const results = await prisma.$transaction(async (tx) => {
    await createFixture(tx);

    const report = [];
    for (const scenario of scenarios) {
      const beforeBytes = await indexSize(tx, scenario.redundantIndex);
      const before = await measure(tx, scenario.query);
      await tx.$executeRawUnsafe(`DROP INDEX ${scenario.redundantIndex}`);
      const after = await measure(tx, scenario.query);
      report.push({
        query: scenario.name,
        redundantIndexBytes: beforeBytes,
        before,
        after
      });
    }

    const boardIndexBeforeBytes = await indexSize(tx, 'bench_boards_organization_id_idx');
    const boardQuery = `SELECT id, created_at FROM bench_boards
      WHERE organization_id = 73 AND archived_at IS NULL
      ORDER BY created_at DESC, id DESC LIMIT 50`;
    const boardBefore = await measure(tx, boardQuery);
    await tx.$executeRawUnsafe('DROP INDEX bench_boards_organization_id_idx');
    await tx.$executeRawUnsafe(`CREATE INDEX bench_boards_org_active_created_id_idx
      ON bench_boards (organization_id, archived_at, created_at, id)`);
    const boardIndexAfterBytes = await indexSize(tx, 'bench_boards_org_active_created_id_idx');
    const boardAfter = await measure(tx, boardQuery);
    report.push({
      query: 'Board: organizationId + archivedAt + createdAt DESC + id DESC',
      oldIndexBytes: boardIndexBeforeBytes,
      candidateIndexBytes: boardIndexAfterBytes,
      before: boardBefore,
      after: boardAfter
    });

    return report;
  }, { maxWait: 10000, timeout: 300000 });

  console.log(JSON.stringify({
    fixture: {
      organizations: 200,
      boards: 100000,
      lists: 30000,
      cards: 750000,
      labels: 80000,
      archivedBoardsPercent: 20,
      archivedListsPercent: 4.8,
      archivedCardsPercent: 20
    },
    repetitions,
    note: 'All fixture tables are temporary and are dropped automatically when the transaction commits.',
    results
  }, null, 2));
} catch (error) {
  console.error('Index benchmark failed:', error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

async function createFixture(tx) {
  await tx.$executeRawUnsafe(`
    CREATE TEMP TABLE bench_boards (
      id bigint PRIMARY KEY,
      organization_id integer NOT NULL,
      created_at timestamp NOT NULL,
      archived_at timestamp
    ) ON COMMIT DROP`);
  await tx.$executeRawUnsafe(`
    INSERT INTO bench_boards
    SELECT (org.n - 1) * 500 + board.n,
           org.n,
           now() - (((org.n * 500 + board.n) % 3650)::text || ' days')::interval,
           CASE WHEN board.n % 5 = 0 THEN now() ELSE NULL END
    FROM generate_series(1, 200) AS org(n)
    CROSS JOIN generate_series(1, 500) AS board(n)`);
  await tx.$executeRawUnsafe(`CREATE INDEX bench_boards_organization_id_idx ON bench_boards (organization_id)`);

  await tx.$executeRawUnsafe(`
    CREATE TEMP TABLE bench_lists (
      id bigint PRIMARY KEY,
      board_id bigint NOT NULL,
      position integer NOT NULL,
      archived_at timestamp
    ) ON COMMIT DROP`);
  await tx.$executeRawUnsafe(`
    INSERT INTO bench_lists
    SELECT (b.id - 1) * 3 + item.n,
           b.id,
           item.n * 1000,
           CASE WHEN item.n = 3 AND b.id % 7 = 0 THEN now() ELSE NULL END
    FROM bench_boards b
    CROSS JOIN generate_series(1, 3) AS item(n)
    WHERE b.id <= 10000`);
  await tx.$executeRawUnsafe(`CREATE UNIQUE INDEX bench_lists_board_position_key ON bench_lists (board_id, position)`);
  await tx.$executeRawUnsafe(`CREATE INDEX bench_lists_board_id_idx ON bench_lists (board_id)`);

  await tx.$executeRawUnsafe(`
    CREATE TEMP TABLE bench_cards (
      id bigint PRIMARY KEY,
      list_id bigint NOT NULL,
      position integer NOT NULL,
      archived_at timestamp
    ) ON COMMIT DROP`);
  await tx.$executeRawUnsafe(`
    INSERT INTO bench_cards
    SELECT (l.id - 1) * 25 + item.n,
           l.id,
           item.n * 1000,
           CASE WHEN item.n % 5 = 0 THEN now() ELSE NULL END
    FROM bench_lists l
    CROSS JOIN generate_series(1, 25) AS item(n)`);
  await tx.$executeRawUnsafe(`CREATE UNIQUE INDEX bench_cards_list_position_key ON bench_cards (list_id, position)`);
  await tx.$executeRawUnsafe(`CREATE INDEX bench_cards_list_id_idx ON bench_cards (list_id)`);

  await tx.$executeRawUnsafe(`
    CREATE TEMP TABLE bench_labels (
      id bigint PRIMARY KEY,
      board_id bigint NOT NULL,
      name text NOT NULL
    ) ON COMMIT DROP`);
  await tx.$executeRawUnsafe(`
    INSERT INTO bench_labels
    SELECT (b.id - 1) * 8 + item.n,
           b.id,
           'label-' || lpad(item.n::text, 2, '0')
    FROM bench_boards b
    CROSS JOIN generate_series(1, 8) AS item(n)
    WHERE b.id <= 10000`);
  await tx.$executeRawUnsafe(`CREATE UNIQUE INDEX bench_labels_board_name_key ON bench_labels (board_id, name)`);
  await tx.$executeRawUnsafe(`CREATE INDEX bench_labels_board_id_idx ON bench_labels (board_id)`);

  for (const table of ['bench_boards', 'bench_lists', 'bench_cards', 'bench_labels']) {
    await tx.$executeRawUnsafe(`ANALYZE ${table}`);
  }
}

async function indexSize(tx, indexName) {
  const rows = await tx.$queryRawUnsafe(
    'SELECT pg_relation_size($1::regclass)::bigint AS bytes',
    indexName
  );
  return Number(rows[0].bytes);
}

async function measure(tx, query) {
  const samples = [];
  let planSummary;
  for (let attempt = 0; attempt < repetitions; attempt += 1) {
    const rows = await tx.$queryRawUnsafe(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`);
    const explain = rows[0]['QUERY PLAN'][0];
    const plan = explain.Plan;
    samples.push(explain['Execution Time']);
    planSummary = {
      nodes: collectNodes(plan),
      actualRows: plan['Actual Rows'],
      localHitBlocks: plan['Local Hit Blocks'] ?? 0,
      localReadBlocks: plan['Local Read Blocks'] ?? 0
    };
  }
  return {
    medianExecutionMs: median(samples),
    samplesMs: samples,
    plan: planSummary
  };
}

function collectNodes(plan) {
  const current = {
    type: plan['Node Type'],
    indexName: plan['Index Name'] ?? null
  };
  return [current, ...(plan.Plans ?? []).flatMap(collectNodes)];
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}
