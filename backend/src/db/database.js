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
    ['invalidReasons', 'TEXT']
  ].forEach(([name, definition]) => ensureColumn(name, definition));

  saveDatabase();
  return db;
}

export async function replaceWorkorders(workorders, source = getDataSource(defaultSourceId)) {
  await initDatabase();
  db.run('BEGIN TRANSACTION');
  try {
    db.run('DELETE FROM workorders WHERE COALESCE(sourceId, ?) = ?', [source.id, source.id]);
    const stmt = db.prepare(`
      INSERT INTO workorders (
        id, sourceId, sourceName, sourceRecordId, coursePosition, grade, week, type,
        description, status, statusGroup, reporter, updatedAt, submittedAt, resolvedAt,
        acceptedAt, archivedAt, owner, researcher, issueCategory, issueKeywords,
        isUnclearRequirement, unclearReasons, riskLevel, riskReasons,
        isRepeatedAdjustmentCandidate, repeatedAdjustmentReasons, suggestions,
        isValidForAnalysis, invalidReasons
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    workorders.forEach((item) => {
      stmt.run([
        item.id,
        item.sourceId || source.id,
        item.sourceName || source.name,
        item.sourceRecordId || item.id,
        item.coursePosition,
        item.grade,
        item.week,
        item.type,
        item.description,
        item.status,
        item.statusGroup,
        item.reporter,
        item.updatedAt,
        item.submittedAt,
        item.resolvedAt,
        item.acceptedAt,
        item.archivedAt,
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
        JSON.stringify(item.suggestions ?? []),
        item.isValidForAnalysis ? 1 : 0,
        JSON.stringify(item.invalidReasons ?? [])
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
      invalidReasons: parseJsonArray(item.invalidReasons)
    };
  });
}

export async function getWorkorderCount(sourceId = defaultSourceId) {
  await initDatabase();
  const result = db.exec('SELECT COUNT(*) AS count FROM workorders WHERE COALESCE(sourceId, ?) = ?', [sourceId, sourceId]);
  return result[0]?.values?.[0]?.[0] ?? 0;
}

export function getDatabasePath() {
  return dbPath;
}
