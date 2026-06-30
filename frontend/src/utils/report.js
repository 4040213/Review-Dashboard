function formatRanking(items = [], limit = 8, labelKey = 'name') {
  if (!items.length) return '- 暂无数据';
  return items
    .slice(0, limit)
    .map((item, index) => `${index + 1}. ${item[labelKey] || item.name}：${item.count ?? item.value ?? 0} 条，占比 ${item.percent ?? '-'}%`)
    .join('\n');
}

function formatArray(values = []) {
  return values.length ? values.join('、') : '未填写';
}

function formatErrorContent(items = []) {
  if (!items.length) return '- 暂无高频出错内容';

  return items
    .slice(0, 5)
    .map((item, index) => {
      const example = item.examples?.[0];
      return `${index + 1}. ${item.name}\n   - 数量：${item.count} 条，占比 ${item.percent}%\n   - 涉及年级：${formatArray(item.grades)}\n   - 高发周次：${formatArray(item.weeks)}\n   - 代表案例：${example?.description || '暂无代表案例'}`;
    })
    .join('\n');
}

function formatFocusWorkorders(items = []) {
  if (!items.length) return '- 暂无重点工单';

  return items
    .slice(0, 10)
    .map((item, index) => {
      return `${index + 1}. 【${item.riskLevel || '-'}风险】${item.description || '未填写问题描述'}\n   - 状态：${item.status || '未填写'}；负责人：${item.owner || '未填写'}；所属类型：${item.type || '未填写'}\n   - 问题分类：${item.issueCategory || '未分类'}；关键词：${formatArray(item.issueKeywords)}\n   - 不明确原因：${formatArray(item.unclearReasons)}\n   - 风险原因：${formatArray(item.riskReasons)}\n   - 处理建议：${formatArray(item.suggestions)}`;
    })
    .join('\n');
}

function buildSuggestions(stats) {
  const suggestions = [];
  const topError = stats.errorContentRanking?.[0];
  const topUnclearReason = stats.unclearReasonRanking?.[0];

  if (topError) {
    suggestions.push(`针对「${topError.name}」建立专项检查清单，该类问题当前 ${topError.count} 条，占比 ${topError.percent}%。`);
  }

  if ((stats.unclearRate ?? 0) >= 20) {
    suggestions.push(`需求不明确占比达到 ${stats.unclearRate}%，建议在提单阶段增加范围、参考链接、验收标准和修改点拆分要求。`);
  }

  if (topUnclearReason) {
    suggestions.push(`需求不明确最常见原因是「${topUnclearReason.reason || topUnclearReason.name}」，建议围绕该原因补充提单模板或示例。`);
  }

  if ((stats.repeatedAdjustmentCandidateCount ?? 0) > 0) {
    suggestions.push(`存在 ${stats.repeatedAdjustmentCandidateCount} 条疑似反复调整工单，占比 ${stats.repeatedAdjustmentRate ?? 0}%，建议复盘需求描述、验收口径或执行理解偏差。`);
  }

  if (stats.classificationWarning) {
    suggestions.push(stats.classificationWarning);
  }

  return suggestions.length ? suggestions.map((item, index) => `${index + 1}. ${item}`).join('\n') : '暂无明显风险建议，可继续观察后续批次数据。';
}

export function buildReviewReport(stats) {
  const generatedAt = new Date().toLocaleString('zh-CN');
  const topError = stats.errorContentRanking?.[0];

  return `# 试题生产工单复盘报告

生成时间：${generatedAt}

## 一、核心结论

- 总工单数：${stats.totalCount ?? 0} 条
- 高频出错内容 Top1：${topError ? `${topError.name}，${topError.count} 条，占比 ${topError.percent}%` : '暂无'}
- 需求不明确：${stats.unclearCount ?? 0} 条，占比 ${stats.unclearRate ?? 0}%
- 疑似反复调整：${stats.repeatedAdjustmentCandidateCount ?? 0} 条，占比 ${stats.repeatedAdjustmentRate ?? 0}%
- 高风险工单：${stats.highRiskCount ?? 0} 条

${stats.classificationWarning ? `> ${stats.classificationWarning}\n` : ''}

## 二、高频出错内容 Top5

${formatErrorContent(stats.errorContentRanking)}

## 三、需求不明确与反复调整

### 3.1 需求不明确原因 Top5

${formatRanking(stats.unclearReasonRanking, 5, 'reason')}

### 3.2 疑似反复调整 Top5

${formatRanking(stats.repeatedAdjustmentRanking, 5)}

## 四、辅助分布

### 4.1 所属类型分布

${formatRanking(stats.typeRanking)}

### 4.2 问题一级分类分布

${formatRanking(stats.issueCategoryRanking)}

### 4.3 年级问题分布

${formatRanking(stats.gradeRanking)}

### 4.4 周次问题分布

${formatRanking(stats.weekRanking)}

## 五、重点工单

${formatFocusWorkorders(stats.focusWorkorders)}

## 六、复盘建议

${buildSuggestions(stats)}
`;
}

export function downloadReviewReport(stats) {
  const report = buildReviewReport(stats);
  const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `试题生产工单复盘报告-${date}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
