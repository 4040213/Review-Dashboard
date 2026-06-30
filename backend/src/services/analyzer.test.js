import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWorkorders, buildStats } from './analyzer.js';

function createWorkorder(overrides = {}) {
  return {
    id: overrides.id || '1',
    coursePosition: '',
    grade: overrides.grade || '三年级',
    week: overrides.week || '第1周',
    type: overrides.type || '内容问题',
    description: overrides.description ?? '题干标点不对，请参考旧版并且全部保持一致',
    status: overrides.status || '处理中',
    reporter: '',
    updatedAt: '',
    owner: overrides.owner || '负责人A',
    researcher: '',
    ...overrides
  };
}

test('analyzeWorkorders classifies issue category and matched keywords', () => {
  const [result] = analyzeWorkorders([
    createWorkorder({ description: '题干中的问号和选项文字不对', status: '完成归档' })
  ]);

  assert.equal(result.issueCategory, '题干/题目/文案');
  assert.deepEqual(result.issueKeywords, ['题干', '选项', '文字', '问号']);
});

test('analyzeWorkorders detects unclear requirement reasons', () => {
  const [result] = analyzeWorkorders([
    createWorkorder({ description: '请参考旧版，所有讲次都保持一致，同时修改按钮位置' })
  ]);

  assert.equal(result.isUnclearRequirement, true);
  assert.deepEqual(result.unclearReasons, ['范围过大', '参考旧版', '单条多需求']);
});

test('analyzeWorkorders marks high risk when description is empty without over-marking repeated adjustment', () => {
  const [result] = analyzeWorkorders([createWorkorder({ description: '', status: '处理中' })]);

  assert.equal(result.riskLevel, '高');
  assert.equal(result.riskReasons.includes('问题描述为空'), true);
  assert.equal(result.isRepeatedAdjustmentCandidate, false);
});

test('analyzeWorkorders marks repeated category as repeated candidate and only high risk when unfinished', () => {
  const archivedResults = analyzeWorkorders([
    createWorkorder({ id: '1', description: '图片显示异常', status: '完成归档' }),
    createWorkorder({ id: '2', description: '图片位置不对', status: '完成归档' }),
    createWorkorder({ id: '3', description: '图片配图显示有问题', status: '完成归档' })
  ]);

  assert.equal(archivedResults.every((item) => item.riskLevel !== '高'), true);
  assert.equal(archivedResults.every((item) => item.isRepeatedAdjustmentCandidate), true);

  const unfinishedResults = analyzeWorkorders([
    createWorkorder({ id: '1', description: '图片显示异常', status: '处理中' }),
    createWorkorder({ id: '2', description: '图片位置不对', status: '处理中' }),
    createWorkorder({ id: '3', description: '图片配图显示有问题', status: '处理中' })
  ]);

  assert.equal(unfinishedResults.every((item) => item.riskLevel === '高'), true);
});

test('buildStats returns dashboard ranking data', () => {
  const analyzed = analyzeWorkorders([
    createWorkorder({ id: '1', grade: '三年级', week: '第1周', type: '内容问题', description: '题干文字不对', status: '完成归档' }),
    createWorkorder({ id: '2', grade: '四年级', week: '第2周', type: '交互问题', description: '点击后流程阻断', status: '处理中' }),
    createWorkorder({ id: '3', grade: '三年级', week: '第1周', type: '内容问题', description: '参考旧版全部一致', status: '处理中' })
  ]);

  const stats = buildStats(analyzed);

  assert.equal(stats.totalCount, 3);
  assert.equal(stats.unfinishedCount, 2);
  assert.equal(stats.completionRate, 33.3);
  assert.equal(stats.unclearCount, 2);
  assert.equal(stats.typeRanking[0].name, '内容问题');
  assert.equal(stats.typeRanking[0].value, 2);
  assert.equal(stats.gradeRanking[0].name, '三年级');
  assert.equal(stats.weekRanking[0].name, '第1周');
});
