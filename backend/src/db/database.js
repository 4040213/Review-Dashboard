import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';
import { defaultSourceId, getDataSource } from '../config/dataSources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../workorders.sqlite');

let SQL;
let db;

function saveDatabase() {
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function ensureColumn(name, definition) {
  const result = db.exec('PRAGMA table_info(workorders)');
  const columns = result[0]?.values?.map((row) => row[1]) || [];
  if (!columns.includes(name)) db.run(`ALTER TABLE workorders ADD COLUMN ${name} ${definition}`);
}

export async function initDatabase() {
  if (db) return db;

  SQL = await initSqlJs();
  db = fs.existsSync(dbPath) ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS workorders (
      id TEXT PRIMARY KEY,
      sourceId TEXT,
      sourceName TEXT,
      sourceRecordId TEXT,
      coursePosition TEXT,
      grade TEXT,
      week TEXT,
      type TEXT,
      description TEXT,
      status TEXT,
      statusGroup TEXT,
      reporter TEXT,
      updatedAt TEXT,
      submittedAt TEXT,
      resolvedAt TEXT,
      acceptedAt TEXT,
      archivedAt TEXT,
      owner TEXT,
      researcher TEXT,
      issueCategory TEXT,
      issueKeywords TEXT,
      isUnclearRequirement INTEGER,
      unclearReasons TEXT,
      riskLevel TEXT,
      riskReasons TEXT,
      isRepeatedAdjustmentCandidate INTEGER,
      repeatedAdjustmentReasons TEXT,
      suggestions TEXT,
      isValidForAnalysis INTEGER,
      invalidReasons TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  [
    ['sourceId', 'TEXT'],
    ['sourceName', 'TEXT'],
    ['sourceRecordId', 'TEXT'],
    ['statusGroup', 'TEXT'],
    ['submittedAt', 'TEXT'],
    ['resolvedAt', 'TEXT'],
    ['acceptedAt', 'TEXT'],
    ['archivedAt', 'TEXT'],
    ['riskReasons', 'TEXT'],
    ['repeatedAdjustmentReasons', 'TEXT'],
    ['suggestions', 'TEXT'],
    ['isValidForAnalysis', 'INTEGER DEFAULT 1'],
    ['invalidReasons', 'TEXT'],
    ['invalidType', 'TEXT'],
    ['reworkRootCause', 'TEXT'],
    ['reworkRootCauseReason', 'TEXT'],
    ['passCount', 'INTEGER DEFAULT 0'],
    ['rejectCount', 'INTEGER DEFAULT 0'],
    ['isUrgent', 'INTEGER DEFAULT 0']
  ].forEach(([name, definition]) => ensureColumn(name, definition));

  // ── 评论表（飞书多维表格评论）──
  db.run(`
    CREATE TABLE IF NOT EXISTS ticket_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feishu_comment_id TEXT NOT NULL,
      feishu_reply_id TEXT DEFAULT '',
      feishu_record_id TEXT NOT NULL DEFAULT '',
      feishu_table_id TEXT DEFAULT '',
      feishu_view_id TEXT DEFAULT '',
      content TEXT DEFAULT '',
      author_name TEXT DEFAULT '',
      author_id TEXT DEFAULT '',
      create_time TEXT DEFAULT '',
      update_time TEXT DEFAULT '',
      is_solved INTEGER DEFAULT 0,
      raw_json TEXT DEFAULT '',
      synced_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ensure unique constraint on comment_id + reply_id
  try {
    db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_comment_reply ON ticket_comments(feishu_comment_id, feishu_reply_id)');
  } catch (_) { /* index may already exist */ }

  // Ensure index on record_id for query performance
  try {
    db.run('CREATE INDEX IF NOT EXISTS idx_comments_record ON ticket_comments(feishu_record_id)');
  } catch (_) { /* index may already exist */ }

  // ── 数据源配置表（持久化自定义数据源）──
  db.run(`
    CREATE TABLE IF NOT EXISTS data_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT DEFAULT 'feishu_bitable',
      bitable_url TEXT DEFAULT '',
      app_token TEXT DEFAULT '',
      table_id TEXT DEFAULT '',
      table_name TEXT DEFAULT '',
      is_active INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ensure columns exist for older DBs
  ['bitable_url', 'table_name', 'is_active'].forEach((col) => {
    try { db.run(`ALTER TABLE data_sources ADD COLUMN ${col} TEXT DEFAULT ''`); } catch (_) {}
  });

  saveDatabase();
  return db;
}

// Map workorder fields to database column values
function mapWorkorderToRow(item, source) {
  return {
    id: item.id,
    sourceId: item.sourceId || source.id,
    sourceName: item.sourceName || source.name,
    sourceRecordId: item.sourceRecordId || item.id,
    coursePosition: item.coursePosition ?? '',
    grade: item.grade ?? '',
    week: item.week ?? '',
    type: item.type ?? '',
    description: item.description ?? '',
    status: item.status ?? '',
    statusGroup: item.statusGroup ?? '',
    reporter: item.reporter ?? '',
    updatedAt: item.updatedAt ?? null,
    submittedAt: item.submittedAt ?? null,
    resolvedAt: item.resolvedAt ?? null,
    acceptedAt: item.acceptedAt ?? null,
    archivedAt: item.archivedAt ?? null,
    owner: item.owner ?? '',
    researcher: item.researcher ?? '',
    issueCategory: item.issueCategory ?? '',
    issueKeywords: JSON.stringify(item.issueKeywords ?? []),
    isUnclearRequirement: item.isUnclearRequirement ? 1 : 0,
    unclearReasons: JSON.stringify(item.unclearReasons ?? []),
    riskLevel: item.riskLevel ?? '',
    riskReasons: JSON.stringify(item.riskReasons ?? []),
    isRepeatedAdjustmentCandidate: item.isRepeatedAdjustmentCandidate ? 1 : 0,
    repeatedAdjustmentReasons: JSON.stringify(item.repeatedAdjustmentReasons ?? []),
    suggestions: JSON.stringify(item.suggestions ?? []),
    isValidForAnalysis: item.isValidForAnalysis ? 1 : 0,
    invalidReasons: JSON.stringify(item.invalidReasons ?? []),
    invalidType: item.invalidType || null,
    reworkRootCause: item.reworkRootCause || null,
    reworkRootCauseReason: item.reworkRootCauseReason || null,
    passCount: item.passCount || 0,
    rejectCount: item.rejectCount || 0,
    isUrgent: item.isUrgent ? 1 : 0
  };
}

export async function replaceWorkorders(workorders, source = getDataSource(defaultSourceId)) {
  await initDatabase();

  // Read actual table columns from the database
  const tableInfo = db.exec('PRAGMA table_info(workorders)');
  const tableColumns = tableInfo[0]?.values?.map((row) => row[1]) || [];
  if (tableColumns.length === 0) {
    throw new Error('workorders 表不存在或没有列');
  }

  // Exclude auto-generated columns that we don't insert
  const insertColumns = tableColumns.filter((col) => col !== 'createdAt');
  const placeholders = insertColumns.map(() => '?').join(', ');
  const sql = `INSERT INTO workorders (${insertColumns.join(', ')}) VALUES (${placeholders})`;

  console.log(`[database] Inserting into ${insertColumns.length} columns: ${insertColumns.join(', ')}`);

  db.run('BEGIN TRANSACTION');
  try {
    db.run('DELETE FROM workorders WHERE COALESCE(sourceId, ?) = ?', [source.id, source.id]);

    const stmt = db.prepare(sql);
    workorders.forEach((item) => {
      const row = mapWorkorderToRow(item, source);
      const values = insertColumns.map((col) => (row[col] !== undefined ? row[col] : null));
      stmt.run(values);
    });

    stmt.free();
    db.run('COMMIT');
    saveDatabase();
    console.log(`[database] Saved ${workorders.length} workorders`);
  } catch (error) {
    db.run('ROLLBACK');
    console.error(`[database] Replace failed: ${error.message}`);
    throw error;
  }
}

function parseJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getAllWorkorders(sourceId = defaultSourceId) {
  await initDatabase();
  const result = db.exec(
    `SELECT * FROM workorders WHERE COALESCE(sourceId, ?) = ? ORDER BY CASE WHEN sourceRecordId GLOB '[0-9]*' THEN CAST(sourceRecordId AS INTEGER) ELSE 999999 END, id`,
    [sourceId, sourceId]
  );
  if (result.length === 0) return [];

  const { columns, values } = result[0];
  return values.map((row) => {
    const item = Object.fromEntries(columns.map((column, index) => [column, row[index]]));
    return {
      id: item.id,
      sourceId: item.sourceId || defaultSourceId,
      sourceName: item.sourceName || getDataSource(item.sourceId || defaultSourceId).name,
      sourceRecordId: item.sourceRecordId || item.id,
      coursePosition: item.coursePosition ?? '',
      grade: item.grade ?? '',
      week: item.week ?? '',
      type: item.type ?? '',
      description: item.description ?? '',
      status: item.status ?? '',
      statusGroup: item.statusGroup ?? '',
      reporter: item.reporter ?? '',
      updatedAt: item.updatedAt ?? null,
      submittedAt: item.submittedAt ?? null,
      resolvedAt: item.resolvedAt ?? null,
      acceptedAt: item.acceptedAt ?? null,
      archivedAt: item.archivedAt ?? null,
      owner: item.owner ?? '',
      researcher: item.researcher ?? '',
      issueCategory: item.issueCategory ?? '',
      issueKeywords: parseJsonArray(item.issueKeywords),
      isUnclearRequirement: Boolean(item.isUnclearRequirement),
      unclearReasons: parseJsonArray(item.unclearReasons),
      riskLevel: item.riskLevel ?? '',
      riskReasons: parseJsonArray(item.riskReasons),
      isRepeatedAdjustmentCandidate: Boolean(item.isRepeatedAdjustmentCandidate),
      repeatedAdjustmentReasons: parseJsonArray(item.repeatedAdjustmentReasons),
      suggestions: parseJsonArray(item.suggestions),
      isValidForAnalysis: item.isValidForAnalysis === null || item.isValidForAnalysis === undefined ? true : Boolean(item.isValidForAnalysis),
      invalidReasons: parseJsonArray(item.invalidReasons),
      invalidType: item.invalidType || null,
      reworkRootCause: item.reworkRootCause || null,
      reworkRootCauseReason: item.reworkRootCauseReason || null,
      passCount: item.passCount || 0,
      rejectCount: item.rejectCount || 0,
      isUrgent: Boolean(item.isUrgent)
    };
  });
}

export async function getWorkorderCount(sourceId = defaultSourceId) {
  await initDatabase();
  const result = db.exec('SELECT COUNT(*) AS count FROM workorders WHERE COALESCE(sourceId, ?) = ?', [sourceId, sourceId]);
  return result[0]?.values?.[0]?.[0] ?? 0;
}

// ── 评论相关数据库操作 ──

export async function insertComments(comments) {
  await initDatabase();
  if (!comments || comments.length === 0) return { saved: 0, skipped: 0 };

  // Count rows before insert to calculate actual inserted count
  let beforeCount = 0;
  const countBefore = db.exec('SELECT COUNT(*) as cnt FROM ticket_comments');
  if (countBefore.length > 0) {
    beforeCount = countBefore[0]?.values?.[0]?.[0] || 0;
  }

  db.run('BEGIN TRANSACTION');
  try {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO ticket_comments
        (feishu_comment_id, feishu_reply_id, feishu_record_id, feishu_table_id, feishu_view_id,
         content, author_name, author_id, create_time, update_time, is_solved, raw_json, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    for (const c of comments) {
      stmt.run([
        c.feishu_comment_id || '',
        c.feishu_reply_id || '',
        c.feishu_record_id || '',
        c.feishu_table_id || '',
        c.feishu_view_id || '',
        c.content || '',
        c.author_name || '',
        c.author_id || '',
        c.create_time || '',
        c.update_time || '',
        c.is_solved ? 1 : 0,
        c.raw_json || '',
        now
      ]);
    }

    stmt.free();
    db.run('COMMIT');
    saveDatabase();

    // Count rows after insert to calculate actual inserted count
    let afterCount = 0;
    const countAfter = db.exec('SELECT COUNT(*) as cnt FROM ticket_comments');
    if (countAfter.length > 0) {
      afterCount = countAfter[0]?.values?.[0]?.[0] || 0;
    }

    const saved = Math.max(0, afterCount - beforeCount);
    const skipped = comments.length - saved;

    return { saved, skipped };
  } catch (error) {
    db.run('ROLLBACK');
    console.error(`[database] Comment insert failed: ${error.message}`);
    throw error;
  }
}

export async function getCommentsByRecordId(feishuRecordId) {
  await initDatabase();
  const result = db.exec(
    `SELECT feishu_comment_id, feishu_reply_id, feishu_record_id, feishu_table_id, feishu_view_id,
            content, author_name, author_id, create_time, update_time, is_solved
     FROM ticket_comments
     WHERE feishu_record_id = ?
     ORDER BY create_time ASC`,
    [feishuRecordId]
  );
  if (result.length === 0) return [];

  const { columns, values } = result[0];
  return values.map((row) => {
    const item = Object.fromEntries(columns.map((col, i) => [col, row[i]]));
    return {
      ...item,
      is_solved: Boolean(item.is_solved)
    };
  });
}

export async function getCommentStatsForRecords(recordIds) {
  await initDatabase();
  if (!recordIds || recordIds.length === 0) return {};

  // Build a map: recordId -> { comment_count, latest_comment_content, latest_comment_author, latest_comment_time }
  const stats = {};
  for (const rid of recordIds) {
    stats[rid] = { comment_count: 0, latest_comment_content: '', latest_comment_author: '', latest_comment_time: '' };
  }

  try {
    // Fetch all comments for the given record IDs in one query
    const placeholders = recordIds.map(() => '?').join(', ');
    const result = db.exec(
      `SELECT feishu_record_id, content, author_name, create_time
       FROM ticket_comments
       WHERE feishu_record_id IN (${placeholders})
       ORDER BY feishu_record_id, create_time ASC`,
      recordIds
    );

    if (result.length > 0) {
      const { columns, values } = result[0];
      // Group by record_id in JavaScript (simpler and more reliable)
      const grouped = {};
      for (const row of values) {
        const item = Object.fromEntries(columns.map((col, i) => [col, row[i]]));
        const rid = item.feishu_record_id;
        if (!grouped[rid]) grouped[rid] = [];
        grouped[rid].push(item);
      }

      // Compute stats per record
      for (const [rid, comments] of Object.entries(grouped)) {
        if (!stats[rid]) continue;
        stats[rid].comment_count = comments.length;
        const latest = comments[comments.length - 1]; // Last after ASC sort
        stats[rid].latest_comment_content = latest.content || '';
        stats[rid].latest_comment_author = latest.author_name || '';
        stats[rid].latest_comment_time = latest.create_time || '';
      }
    }
  } catch (err) {
    console.warn(`[database] Failed to get comment stats: ${err.message}`);
  }

  return stats;
}

export function getDatabasePath() {
  return dbPath;
}

// ── 数据源配置 CRUD ──

/** 获取所有数据源（优先 DB，Fallback 到 config 文件） */
export async function getAllDataSources() {
  await initDatabase();
  try {
    const result = db.exec('SELECT * FROM data_sources ORDER BY updated_at DESC');
    if (result.length > 0) {
      const { columns, values } = result[0];
      return values.map((row) => {
        const item = Object.fromEntries(columns.map((col, i) => [col, row[i]]));
        return { ...item, is_active: Boolean(item.is_active) };
      });
    }
  } catch (_) { /* table may not exist yet */ }
  return [];
}

/** 保存或更新数据源 */
export async function saveDataSource(source) {
  await initDatabase();
  const now = new Date().toISOString();
  db.run(
    `INSERT OR REPLACE INTO data_sources (id, name, provider, bitable_url, app_token, table_id, table_name, is_active, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      source.id, source.name, source.provider || 'feishu_bitable',
      source.bitableUrl || source.bitable_url || '',
      source.appToken || source.app_token || '',
      source.tableId || source.table_id || '',
      source.tableName || source.table_name || '',
      source.isActive || source.is_active ? 1 : 0,
      now
    ]
  );
  saveDatabase();
  return source;
}

/** 设置活跃数据源（取消其他活跃标记） */
export async function setActiveDataSource(sourceId) {
  await initDatabase();
  db.run('UPDATE data_sources SET is_active = 0');
  db.run('UPDATE data_sources SET is_active = 1, updated_at = ? WHERE id = ?', [new Date().toISOString(), sourceId]);
  saveDatabase();
}

/** 删除数据源 */
export async function deleteDataSource(sourceId) {
  await initDatabase();
  db.run('DELETE FROM data_sources WHERE id = ?', [sourceId]);
  saveDatabase();
}
