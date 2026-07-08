import xlsx from 'xlsx';

const TARGET_SHEET_NAME = '工单任务';

const fieldAliases = {
  coursePosition: ['课程定位', '课程', '课程名称', '课程名', '定位', '课程定位（选择）', '课程定位(选择)', '课程定位（必填）', '课程定位(必填)'],
  grade: ['年级', '年级（选择）', '年级(选择)', '学段', '年级段', '年级级别', '年级（选择）', '年级(选择)'],
  week: ['周', '周（选择）', '周(选择)', '周次', '课时', '教学周', '周课', '周次（选择）', '周次(选择)'],
  type: ['所属类型', '类型', '所属类型（选择）', '所属类型(选择)', '工单类型', '问题类型', '类别', '分类', '所属类别', '工单分类'],
  description: ['问题描述', '描述', '问题', '工单描述', '问题详情', '问题详述', '问题描述（必填）', '问题描述(必填)', '详情', '内容', '工单内容', '问题内容', '问题描述（选择）', '问题描述(选择)'],
  status: ['状态', '状态（选择）', '状态(选择)', '工单状态', '处理状态', '当前状态', '进度', '状态（选择）', '状态(选择)'],
  reporter: ['上报人', '提交人', '提报人', '发起人', '创建人', '上报人员', '提交人员'],
  updatedAt: ['最后更新时间', '更新时间', '最近更新时间', '更新日期', '修改时间', '最后修改时间', '最近修改时间', '修改日期'],
  submittedAt: ['工单提出时间', '提出时间', '创建时间', '提交时间', '上报时间', '创建日期', '工单创建时间', '发起时间', '上报日期', '提交日期', '提报时间'],
  resolvedAt: ['工单解决时间', '解决时间', '处理完成时间', '完成时间', '解决日期', '处理时间', '结案时间', '完成日期'],
  acceptedAt: ['工单验收时间', '验收时间', '教研验收时间', '验收完成时间', '验收完成日期', '教研验收完成时间'],
  archivedAt: ['工单归档时间', '归档时间', '完成归档时间', '关闭时间', '归档日期', '归档完成时间', '关闭日期', '结案日期'],
  owner: ['工单默认负责人', '默认负责人', '负责人', '处理人', '经办人', '指派给', '责任人', '负责人（默认）', '负责人(默认)'],
  researcher: ['教研负责人', '教研负责', '教研跟进人', '教研主管']
};

function normalizeHeader(header = '') {
  return String(header)
    .trim()
    .replace(/[()（）]/g, '（）')
    .replace(/\s+/g, '')
    .replace(/（.*?）/g, '')
    .replace(/[：:]/g, '');
}

function buildHeaderMap(headers) {
  const rawHeaders = headers.map((h) => String(h).trim());
  const normalizedHeaders = headers.map((header) => ({
    raw: header,
    normalized: normalizeHeader(header)
  }));

  const result = {};
  for (const [field, aliases] of Object.entries(fieldAliases)) {
    // First try exact match on raw header
    let matched = rawHeaders.find((raw) => aliases.includes(raw));
    if (!matched) {
      // Then try normalized match
      const normalizedAliases = aliases.map(normalizeHeader);
      matched = normalizedHeaders.find(({ raw, normalized }) =>
        aliases.includes(raw) || normalizedAliases.includes(normalized)
      )?.raw ?? null;
    }
    result[field] = matched;
  }

  return result;
}

function stringifyCell(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    // Format date as ISO-like string without timezone offset (use local time)
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return String(value).trim();
}

function nullableCell(value) {
  const text = stringifyCell(value);
  return text || null;
}

/**
 * Find the best sheet to parse.
 * 1. Exact match on TARGET_SHEET_NAME
 * 2. Case-insensitive match
 * 3. Substring match
 * 4. First sheet as fallback
 */
function findTargetSheet(sheetNames) {
  // Exact match
  if (sheetNames.includes(TARGET_SHEET_NAME)) return TARGET_SHEET_NAME;

  // Case-insensitive match (normalize spaces, case)
  const normalizedTarget = TARGET_SHEET_NAME.replace(/\s+/g, '').toLowerCase();
  const ciMatch = sheetNames.find(
    (name) => name.replace(/\s+/g, '').toLowerCase() === normalizedTarget
  );
  if (ciMatch) return ciMatch;

  // Substring match
  const subMatch = sheetNames.find((name) => name.includes('工单'));
  if (subMatch) return subMatch;

  // Fallback: first sheet
  return sheetNames[0];
}

/**
 * Normalize sheet rows so every data row has exactly the same number of columns
 * as the header row. Missing trailing cells are filled with empty strings.
 * This prevents "N values for M columns" errors from xlsx sheet_to_json.
 *
 * @param {import('xlsx').WorkSheet} sheet
 * @returns {{ headers: string[], rows: object[] }}
 */
function parseRowsWithColumnPadding(sheet) {
  // Get raw 2D array (row 0 = header if exists)
  const raw = xlsx.utils.sheet_to_json(sheet, {
    defval: '',
    header: 1,
    raw: false
  });

  if (!raw || raw.length === 0) {
    return { headers: [], rows: [] };
  }

  // Find the first non-empty row to use as header (skip empty leading rows)
  let headerRowIndex = 0;
  while (headerRowIndex < raw.length && raw[headerRowIndex].every((cell) => !String(cell || '').trim())) {
    headerRowIndex++;
  }

  if (headerRowIndex >= raw.length) {
    return { headers: [], rows: [] };
  }

  const headerRow = raw[headerRowIndex];
  const colCount = headerRow.length;

  // If no data rows after header, return just the header
  if (headerRowIndex + 1 >= raw.length) {
    const headers = headerRow.map((h) => String(h).trim());
    return { headers, rows: [] };
  }

  // Pad header and all data rows to colCount
  const paddedHeader = headerRow.slice(0, colCount);
  // Ensure header has at least one non-empty cell
  while (paddedHeader.length > 0 && !String(paddedHeader[paddedHeader.length - 1] || '').trim()) {
    paddedHeader.pop();
  }

  // Recalculate colCount after trimming empty trailing header cells
  const finalColCount = Math.max(paddedHeader.length, 1);

  const dataRows = [];
  for (let i = headerRowIndex + 1; i < raw.length; i++) {
    const row = raw[i];
    // Skip completely empty rows
    if (!row || row.every((cell) => !String(cell || '').trim())) continue;

    // Pad or trim row to match finalColCount
    const padded = new Array(finalColCount).fill('');
    for (let c = 0; c < Math.min(row.length, finalColCount); c++) {
      padded[c] = row[c];
    }
    dataRows.push(padded);
  }

  // Build object array from padded header + data rows
  const headers = paddedHeader.map((h) => String(h).trim());
  const rows = dataRows.map((arr) => {
    const obj = {};
    for (let c = 0; c < headers.length && c < arr.length; c++) {
      obj[headers[c]] = arr[c];
    }
    return obj;
  });

  return { headers, rows };
}

export function parseWorkorderExcel(buffer) {
  let workbook;
  try {
    workbook = xlsx.read(buffer, {
      type: 'buffer',
      cellDates: true,
      codepage: 65001 // UTF-8
    });
  } catch (err) {
    throw new Error(`无法解析 Excel 文件，请确认文件格式为 .xlsx 或 .xls：${err.message}`);
  }

  const sheetNames = workbook.SheetNames || [];
  if (sheetNames.length === 0) {
    throw new Error('Excel 文件中没有任何工作表（sheet）');
  }

  const targetSheet = findTargetSheet(sheetNames);
  const sheet = workbook.Sheets[targetSheet];

  // Parse with column padding to handle inconsistent row lengths
  const { headers, rows } = parseRowsWithColumnPadding(sheet);

  if (rows.length === 0) {
    throw new Error(
      `工作表「${targetSheet}」中没有数据行。可用的 sheet：${sheetNames.join('、')}`
    );
  }

  const headerMap = buildHeaderMap(headers);

  // Log header mapping for debugging
  console.log(`[excelParser] Parsing sheet: "${targetSheet}" (available sheets: ${sheetNames.join(', ')})`);
  console.log(`[excelParser] Detected headers: ${headers.join(', ')}`);
  console.log(`[excelParser] Header mapping:`, JSON.stringify(headerMap, null, 2));

  // Check if critical fields mapped
  const missingFields = Object.entries(headerMap)
    .filter(([_, v]) => !v)
    .map(([k]) => k);
  if (missingFields.length > 0) {
    console.warn(`[excelParser] Some fields could not be mapped: ${missingFields.join(', ')}. Available headers: ${headers.join(', ')}`);
  }

  const parsed = rows.map((row, index) => ({
    id: String(index + 1),
    coursePosition: stringifyCell(row[headerMap.coursePosition]),
    grade: stringifyCell(row[headerMap.grade]),
    week: stringifyCell(row[headerMap.week]),
    type: stringifyCell(row[headerMap.type]),
    description: stringifyCell(row[headerMap.description]),
    status: stringifyCell(row[headerMap.status]),
    reporter: stringifyCell(row[headerMap.reporter]),
    updatedAt: nullableCell(row[headerMap.updatedAt]),
    submittedAt: nullableCell(row[headerMap.submittedAt]),
    resolvedAt: nullableCell(row[headerMap.resolvedAt]),
    acceptedAt: nullableCell(row[headerMap.acceptedAt]),
    archivedAt: nullableCell(row[headerMap.archivedAt]),
    owner: stringifyCell(row[headerMap.owner]),
    researcher: stringifyCell(row[headerMap.researcher])
  }));

  console.log(`[excelParser] Parsed ${parsed.length} rows successfully`);

  return parsed;
}
