import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import xlsx from 'xlsx';
import { parseWorkorderExcel } from './excelParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sampleExcelPath = path.resolve(__dirname, '../../../samples/26 年暑假系统课生产.xlsx');

function createWorkbookBuffer() {
  const workbook = xlsx.utils.book_new();
  const sheet = xlsx.utils.json_to_sheet([
    {
      课程定位: '系统课',
      '年级（选择）': '三年级',
      '周（选择）': '第1周',
      '所属类型（选择）': '内容问题',
      问题描述: '题干文字不对',
      '状态（选择）': '处理中',
      上报人: '张三',
      最后更新时间: '2026-06-30',
      工单默认负责人: '李四',
      教研负责人: '王五'
    }
  ]);
  xlsx.utils.book_append_sheet(workbook, sheet, '工单任务');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

test('parseWorkorderExcel maps Feishu exported option-style headers', () => {
  const [result] = parseWorkorderExcel(createWorkbookBuffer());

  assert.equal(result.coursePosition, '系统课');
  assert.equal(result.grade, '三年级');
  assert.equal(result.week, '第1周');
  assert.equal(result.type, '内容问题');
  assert.equal(result.description, '题干文字不对');
  assert.equal(result.status, '处理中');
  assert.equal(result.reporter, '张三');
  assert.equal(result.updatedAt, '2026-06-30');
  assert.equal(result.owner, '李四');
  assert.equal(result.researcher, '王五');
});

test('parseWorkorderExcel throws when target sheet is missing', () => {
  const workbook = xlsx.utils.book_new();
  const sheet = xlsx.utils.json_to_sheet([{ name: '测试' }]);
  xlsx.utils.book_append_sheet(workbook, sheet, '其他');
  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  assert.throws(() => parseWorkorderExcel(buffer), /未找到名为「工单任务」的 sheet/);
});

test('parseWorkorderExcel can parse provided sample Excel file', { skip: !fs.existsSync(sampleExcelPath) }, () => {
  const rows = parseWorkorderExcel(fs.readFileSync(sampleExcelPath));

  assert.ok(rows.length > 0);
  assert.ok(Object.hasOwn(rows[0], 'coursePosition'));
  assert.ok(Object.hasOwn(rows[0], 'grade'));
  assert.ok(Object.hasOwn(rows[0], 'week'));
  assert.ok(Object.hasOwn(rows[0], 'type'));
  assert.ok(Object.hasOwn(rows[0], 'description'));
  assert.ok(Object.hasOwn(rows[0], 'status'));
});
