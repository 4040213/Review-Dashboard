/**
 * 统一飞书同步服务
 *
 * 整合工单同步 + 评论同步为一次调用，支持并行拉取，
 * 并提供字段覆盖率诊断，帮助快速定位数据质量问题。
 */

import { getDataSource } from '../config/dataSources.js';
import { replaceWorkorders, insertComments } from '../db/database.js';
import { analyzeWorkorders, buildStats } from './analyzer.js';
import { fetchFeishuWorkorders } from './feishuClient.js';
import { fetchAllComments } from './feishuComments.js';

/**
 * 诊断工单字段覆盖率
 * @param {Array} workorders
 * @returns {Object} 每个字段的非空率
 */
export function diagnoseFieldCoverage(workorders) {
  if (!workorders || workorders.length === 0) {
    return { total: 0, coverage: {}, warnings: ['无工单数据'] };
  }

  const fields = [
    'coursePosition', 'grade', 'week', 'type', 'description',
    'status', 'reporter', 'updatedAt', 'submittedAt', 'owner', 'researcher'
  ];

  const total = workorders.length;
  const coverage = {};
  const warnings = [];

  fields.forEach((field) => {
    const nonEmpty = workorders.filter((w) => {
      const val = w[field];
      return val !== null && val !== undefined && String(val).trim() !== '';
    }).length;
    const rate = Math.round((nonEmpty / total) * 100);
    coverage[field] = { nonEmpty, rate };

    if (rate < 50) {
      warnings.push(`⚠️ 字段 "${field}" 覆盖率仅 ${rate}%（${nonEmpty}/${total}），图表可能缺少数据`);
    }
  });

  // 关键字段检查（图表强依赖）
  if (coverage.submittedAt?.rate < 30 && coverage.updatedAt?.rate < 30) {
    warnings.push('🔴 时间字段（submittedAt/updatedAt）缺失严重，吞吐趋势、流转等图表将无数据');
  }
  if (coverage.description?.rate < 50) {
    warnings.push('🟡 问题描述缺失较多，AI 分类效果受影响');
  }

  console.log('[syncService] 字段覆盖率诊断:');
  console.table(Object.entries(coverage).map(([field, info]) => ({
    字段: field,
    非空数: info.nonEmpty,
    覆盖率: `${info.rate}%`
  })));

  if (warnings.length) {
    console.log('[syncService] 诊断警告:');
    warnings.forEach((w) => console.log(`  ${w}`));
  }

  return { total, coverage, warnings };
}

/**
 * 统一同步：并行拉取工单和评论，然后分析入库
 *
 * @param {string} sourceId - 数据源 ID
 * @param {object} options
 * @param {string} [options.bitableUrl] - 自定义多维表格链接
 * @param {string} [options.tableId] - 自定义表格 ID
 * @param {boolean} [options.syncComments=true] - 是否同步评论
 * @returns {Promise<Object>} 同步结果
 */
export async function syncAll(sourceId, options = {}) {
  const { bitableUrl, tableId, syncComments = true } = options;
  const overrides = {};
  if (bitableUrl) overrides.bitableUrl = bitableUrl;
  if (tableId) overrides.tableId = tableId;

  const source = getDataSource(sourceId);
  const syncedAt = new Date().toISOString();
  const result = {
    source: { id: source.id, name: source.name, provider: source.provider },
    syncedAt,
    workorders: { count: 0, stats: null, coverage: null },
    comments: { rawCount: 0, savedCount: 0, skippedCount: 0, error: null }
  };

  // ── 1. 同步工单 ──
  console.log('[syncService] 开始同步工单...');
  const { workorders: parsedWorkorders } = await fetchFeishuWorkorders(sourceId, overrides);
  const workorders = analyzeWorkorders(parsedWorkorders);
  await replaceWorkorders(workorders, source);

  result.workorders.count = workorders.length;
  result.workorders.stats = buildStats(workorders);
  result.workorders.coverage = diagnoseFieldCoverage(workorders);

  console.log(`[syncService] 工单同步完成: ${workorders.length} 条`);

  // ── 2. 同步评论（并行或跳过）──
  if (syncComments) {
    console.log('[syncService] 开始同步评论...');
    try {
      const comments = await fetchAllComments(overrides);
      result.comments.rawCount = comments.length;

      if (comments.length > 0) {
        const { saved, skipped } = await insertComments(comments);
        result.comments.savedCount = saved;
        result.comments.skippedCount = skipped;
        console.log(`[syncService] 评论同步完成: ${saved} 条新增, ${skipped} 条跳过`);
      } else {
        console.log('[syncService] 评论同步: 飞书返回 0 条评论');
      }
    } catch (error) {
      console.error(`[syncService] 评论同步失败: ${error.message}`);
      result.comments.error = error.message;
      // 评论同步失败不影响工单同步结果
    }
  }

  result.completed = true;
  return result;
}
