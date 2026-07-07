import 'dotenv/config';
import { getDataSource } from '../config/dataSources.js';

const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';
const defaultFieldAliases = {
  coursePosition: ['课程定位'],
  grade: ['年级', '年级（选择）', '年级(选择)'],
  week: ['周', '周（选择）', '周(选择)', '周次'],
  type: ['所属类型', '类型', '所属类型（选择）', '所属类型(选择)'],
  description: ['问题描述', '描述', '问题', '工单描述'],
  status: ['状态', '状态（选择）', '状态(选择)'],
  reporter: ['上报人', '提交人'],
  updatedAt: ['最后更新时间', '更新时间', '最近更新时间', '更新日期'],
  submittedAt: ['工单提出时间', '提出时间', '创建时间', '提交时间', '上报时间', '创建日期'],
  resolvedAt: ['工单解决时间', '解决时间', '处理完成时间', '完成时间', '解决日期'],
  acceptedAt: ['工单验收时间', '验收时间', '教研验收时间', '验收完成时间'],
  archivedAt: ['工单归档时间', '归档时间', '完成归档时间', '关闭时间', '归档日期'],
  owner: ['工单默认负责人', '默认负责人', '负责人'],
  researcher: ['教研负责人']
};

async function feishuRequest(path, options = {}) {
  const response = await fetch(`${FEISHU_API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || (data.code !== undefined && data.code !== 0)) throw new Error(data.msg || data.message || `飞书接口请求失败：${path}`);
  return data;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`缺少环境变量 ${name}`);
  return value;
}

function parseWikiToken(url = '') {
  return String(url).match(/\/wiki\/([^/?#]+)/)?.[1] || '';
}

function parseTableId(url = '') {
  return String(url).match(/[?&]table=([^&#]+)/)?.[1] || '';
}

export async function getTenantAccessToken() {
  const data = await feishuRequest('/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    body: JSON.stringify({ app_id: requiredEnv('FEISHU_APP_ID'), app_secret: requiredEnv('FEISHU_APP_SECRET') })
  });
  return data.tenant_access_token;
}

function envValue(name) {
  return name ? process.env[name] : '';
}

async function getBitableAppToken(tenantAccessToken, source) {
  const configuredToken = envValue(source.appTokenEnv) || process.env.FEISHU_BITABLE_APP_TOKEN;
  if (configuredToken) return configuredToken;

  const bitableUrl = envValue(source.bitableUrlEnv) || requiredEnv('FEISHU_BITABLE_URL');
  const wikiToken = parseWikiToken(bitableUrl);
  if (!wikiToken) throw new Error('无法从飞书多维表格链接解析 wiki token');

  const data = await feishuRequest(`/wiki/v2/spaces/get_node?token=${encodeURIComponent(wikiToken)}`, {
    headers: { Authorization: `Bearer ${tenantAccessToken}` }
  });
  const appToken = data.data?.node?.obj_token;
  if (!appToken) throw new Error('无法从飞书 wiki 节点解析多维表格 app_token');
  return appToken;
}

function getTableId(source) {
  return envValue(source.tableIdEnv) || process.env.FEISHU_BITABLE_TABLE_ID || parseTableId(envValue(source.bitableUrlEnv) || process.env.FEISHU_BITABLE_URL || '');
}

async function fetchAllRecords(tenantAccessToken, appToken, tableId) {
  const records = [];
  let pageToken = '';
  do {
    const query = new URLSearchParams({ page_size: '500' });
    if (pageToken) query.set('page_token', pageToken);
    const data = await feishuRequest(`/bitable/v1/apps/${appToken}/tables/${tableId}/records?${query.toString()}`, {
      headers: { Authorization: `Bearer ${tenantAccessToken}` }
    });
    records.push(...(data.data?.items || []));
    pageToken = data.data?.page_token || '';
  } while (pageToken);
  return records;
}

function normalizeHeader(header = '') {
  return String(header).trim().replace(/[()]/g, '（）').replace(/\s+/g, '').replace(/（.*?）/g, '');
}

function getAliases(source, field) {
  return [...(source.fieldAliases?.[field] || []), ...(defaultFieldAliases[field] || [])];
}

function findFieldValue(fields, aliases) {
  const entries = Object.entries(fields || {});
  const normalizedAliases = aliases.map(normalizeHeader);
  const matched = entries.find(([key]) => aliases.includes(String(key).trim()) || normalizedAliases.includes(normalizeHeader(key)));
  return matched?.[1];
}

function formatTimestamp(value) {
  const numericValue = Number(value);
  if (!numericValue) return '';
  const milliseconds = numericValue < 10_000_000_000 ? numericValue * 1000 : numericValue;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function stringifyFieldValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && value > 1_000_000_000) return formatTimestamp(value);
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  if (Array.isArray(value)) return value.map(stringifyFieldValue).filter(Boolean).join('、');
  if (typeof value === 'object') {
    if (value.text) return stringifyFieldValue(value.text);
    if (value.name) return stringifyFieldValue(value.name);
    if (value.en_name) return stringifyFieldValue(value.en_name);
    if (value.value) return stringifyFieldValue(value.value);
    if (value.timestamp) return formatTimestamp(value.timestamp);
    if (value.link) return stringifyFieldValue(value.link);
    if (value.url) return stringifyFieldValue(value.url);
    return Object.values(value).map(stringifyFieldValue).filter(Boolean).join('、');
  }
  return String(value).trim();
}

function nullableField(value) {
  const text = stringifyFieldValue(value);
  return text || null;
}

export function inferStatusTimes({ status, updatedAt, submittedAt, resolvedAt, acceptedAt, archivedAt }) {
  return {
    submittedAt,
    resolvedAt: resolvedAt || (['待教研验收', '教研验收中', '完成归档'].includes(status) ? updatedAt : null),
    acceptedAt: acceptedAt || (['教研验收中', '完成归档'].includes(status) ? updatedAt : null),
    archivedAt: archivedAt || (status === '完成归档' ? updatedAt : null)
  };
}

function mapRecordToWorkorder(record, index, source) {
  const fields = record.fields || {};
  const getValue = (field) => findFieldValue(fields, getAliases(source, field));
  const createdAt = formatTimestamp(record.created_time || record.createdAt || record.createdTime);
  const modifiedAt = formatTimestamp(record.last_modified_time || record.updated_time || record.modified_time || record.lastModifiedTime);
  const updatedAt = nullableField(getValue('updatedAt')) || modifiedAt || null;
  const status = stringifyFieldValue(getValue('status'));
  const explicitSubmittedAt = nullableField(getValue('submittedAt'));
  const inferredTimes = inferStatusTimes({
    status,
    updatedAt,
    submittedAt: explicitSubmittedAt || createdAt || updatedAt || null,
    resolvedAt: nullableField(getValue('resolvedAt')),
    acceptedAt: nullableField(getValue('acceptedAt')),
    archivedAt: nullableField(getValue('archivedAt'))
  });

  return {
    id: `${source.id}:${record.record_id || index + 1}`,
    sourceId: source.id,
    sourceName: source.name,
    sourceRecordId: record.record_id || String(index + 1),
    coursePosition: stringifyFieldValue(getValue('coursePosition')),
    grade: stringifyFieldValue(getValue('grade')),
    week: stringifyFieldValue(getValue('week')),
    type: stringifyFieldValue(getValue('type')),
    description: stringifyFieldValue(getValue('description')),
    status,
    reporter: stringifyFieldValue(getValue('reporter')),
    updatedAt,
    submittedAt: inferredTimes.submittedAt,
    resolvedAt: inferredTimes.resolvedAt,
    acceptedAt: inferredTimes.acceptedAt,
    archivedAt: inferredTimes.archivedAt,
    owner: stringifyFieldValue(getValue('owner')),
    researcher: stringifyFieldValue(getValue('researcher'))
  };
}

export async function fetchFeishuWorkorders(sourceId, overrides = {}) {
  const source = getDataSource(sourceId);
  const tenantAccessToken = await getTenantAccessToken();

  // 支持自定义 bitable URL / table ID 覆盖默认配置
  let appToken, tableId;

  if (overrides.bitableUrl) {
    // 从自定义 URL 解析 app_token 和 table_id
    const wikiMatch = String(overrides.bitableUrl).match(/\/wiki\/([^/?#]+)/);
    const wikiToken = wikiMatch?.[1] || '';
    if (wikiToken) {
      const wikiData = await feishuRequest(
        `/wiki/v2/spaces/get_node?token=${encodeURIComponent(wikiToken)}`,
        { headers: { Authorization: `Bearer ${tenantAccessToken}` } }
      );
      appToken = wikiData.data?.node?.obj_token;
      if (!appToken) throw new Error('无法从提供的链接解析多维表格 app_token，请确认链接格式正确');
    } else {
      throw new Error('提供的链接格式不正确，需要包含 /wiki/ 路径');
    }
    // 从 URL 解析 table_id
    const tableMatch = String(overrides.bitableUrl).match(/[?&]table=([^&#]+)/);
    tableId = overrides.tableId || tableMatch?.[1] || '';
  } else {
    appToken = await getBitableAppToken(tenantAccessToken, source);
    tableId = overrides.tableId || getTableId(source);
  }

  if (!tableId) throw new Error('缺少飞书多维表格 table_id，请在链接中包含 ?table=xxx 或手动输入');
  if (!appToken) throw new Error('缺少飞书多维表格 app_token');

  console.log(`[feishuClient] 同步表格: app_token=${appToken}, table_id=${tableId}`);

  const records = await fetchAllRecords(tenantAccessToken, appToken, tableId);
  return { source, workorders: records.map((record, index) => mapRecordToWorkorder(record, index, source)) };
}
