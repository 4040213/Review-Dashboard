import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

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
  if (!columns.includes(name)) {
    db.run(`ALTER TABLE workorders ADD COLUMN ${name} ${definition}`);
  }
}

export async function initDatabase() {
  if (db) return db;

  SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS workorders (
      id TEXT PRIMARY KEY,
      coursePosition TEXT,
      grade TEXT,
      week TEXT,
      type TEXT,
      description TEXT,
      status TEXT,
      reporter TEXT,
      updatedAt TEXT,
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
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  ensureColumn('riskReasons', 'TEXT');
  ensureColumn('repeatedAdjustmentReasons', 'TEXT');
  ensureColumn('suggestions', 'TEXT');
  saveDatabase();

  return db;
}

export async function replaceWorkorders(workorders) {
  await initDatabase();
  db.run('BEGIN TRANSACTION');
  try {
    db.run('DELETE FROM workorders');
    const stmt = db.prepare(`
      INSERT INTO workorders (
        id,
        coursePosition,
        grade,
        week,
        type,
        description,
        status,
        reporter,
        updatedAt,
        owner,
        researcher,
        issueCategory,
        issueKeywords,
        isUnclearRequirement,
        unclearReasons,
        riskLevel,
        riskReasons,
        isRepeatedAdjustmentCandidate,
        repeatedAdjustmentReasons,
        suggestions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    workorders.forEach((item) => {
      stmt.run([
        item.id,
        item.coursePosition,
        item.grade,
        item.week,
        item.type,
        item.description,
        item.status,
        item.reporter,
        item.updatedAt,
        item.owner,
        item.researcher,
        item.issueCategory,
        JSON.stringify(item.issueKeywords ?? []),
        item.isUnclearRequirement ? 1 : 0,
        JSON.stringify(item.unclearReasons ?? []),
        item.riskLevel,
        JSON.stringify(item.riskReasons ?? []),
        item.isRepeatedAdjustmentCandidate ? 1 : 0,
        JSON.stringify(item.repeatedAdjustmentReasons ?? []),
        JSON.stringify(item.suggestions ?? [])
      ]);
    });

    stmt.free();
    db.run('COMMIT');
    saveDatabase();
  } catch (error) {
    db.run('ROLLBACK');
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

export async function getAllWorkorders() {
  await initDatabase();
  const result = db.exec(
    `SELECT * FROM workorders ORDER BY CASE WHEN id GLOB '[0-9]*' THEN CAST(id AS INTEGER) ELSE 999999 END, id`
  );

  if (result.length === 0) return [];

  const { columns, values } = result[0];
  return values.map((row) => {
    const item = Object.fromEntries(columns.map((column, index) => [column, row[index]]));

    return {
      id: item.id,
      coursePosition: item.coursePosition ?? '',
      grade: item.grade ?? '',
      week: item.week ?? '',
      type: item.type ?? '',
      description: item.description ?? '',
      status: item.status ?? '',
      reporter: item.reporter ?? '',
      updatedAt: item.updatedAt ?? '',
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
      suggestions: parseJsonArray(item.suggestions)
    };
  });
}

export async function getWorkorderCount() {
  await initDatabase();
  const result = db.exec('SELECT COUNT(*) AS count FROM workorders');
  return result[0]?.values?.[0]?.[0] ?? 0;
}

export function getDatabasePath() {
  return dbPath;
}
