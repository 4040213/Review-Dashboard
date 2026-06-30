import xlsx from 'xlsx';

const TARGET_SHEET_NAME = '工单任务';

const fieldAliases = {
  coursePosition: ['课程定位'],
  grade: ['年级', '年级（选择）', '年级(选择)'],
  week: ['周', '周（选择）', '周(选择)', '周次'],
  type: ['所属类型', '类型', '所属类型（选择）', '所属类型(选择)'],
  description: ['问题描述', '描述', '问题', '工单描述'],
  status: ['状态', '状态（选择）', '状态(选择)'],
  reporter: ['上报人', '提交人'],
  updatedAt: ['最后更新时间', '更新时间', '更新日期'],
  owner: ['工单默认负责人', '默认负责人', '负责人'],
  researcher: ['教研负责人']
};

function normalizeHeader(header = '') {
  return String(header)
    .trim()
    .replace(/[()]/g, '（）')
    .replace(/\s+/g, '')
    .replace(/（.*?）/g, '');
}

function buildHeaderMap(headers) {
  const normalizedHeaders = headers.map((header) => ({
    raw: header,
    normalized: normalizeHeader(header)
  }));

  return Object.fromEntries(
    Object.entries(fieldAliases).map(([field, aliases]) => {
      const normalizedAliases = aliases.map(normalizeHeader);
      const matched = normalizedHeaders.find(({ raw, normalized }) => {
        return aliases.includes(String(raw).trim()) || normalizedAliases.includes(normalized);
      });
      return [field, matched?.raw ?? null];
    })
  );
}

function stringifyCell(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

export function parseWorkorderExcel(buffer) {
  const workbook = xlsx.read(buffer, {
    type: 'buffer',
    cellDates: true
  });

  if (!workbook.SheetNames.includes(TARGET_SHEET_NAME)) {
    throw new Error(`未找到名为「${TARGET_SHEET_NAME}」的 sheet`);
  }

  const sheet = workbook.Sheets[TARGET_SHEET_NAME];
  const rows = xlsx.utils.sheet_to_json(sheet, {
    defval: '',
    raw: false
  });

  if (rows.length === 0) {
    return [];
  }

  const headers = Object.keys(rows[0]);
  const headerMap = buildHeaderMap(headers);

  return rows.map((row, index) => ({
    id: String(index + 1),
    coursePosition: stringifyCell(row[headerMap.coursePosition]),
    grade: stringifyCell(row[headerMap.grade]),
    week: stringifyCell(row[headerMap.week]),
    type: stringifyCell(row[headerMap.type]),
    description: stringifyCell(row[headerMap.description]),
    status: stringifyCell(row[headerMap.status]),
    reporter: stringifyCell(row[headerMap.reporter]),
    updatedAt: stringifyCell(row[headerMap.updatedAt]),
    owner: stringifyCell(row[headerMap.owner]),
    researcher: stringifyCell(row[headerMap.researcher])
  }));
}
