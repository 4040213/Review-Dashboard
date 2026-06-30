import { issueRules } from '../rules/issueRules.js';
import { unclearRules } from '../rules/riskRules.js';

const repeatedAdjustmentKeywords = ['还是', '仍然', '重新', '再改', '又', '没改到', '继续改', '二次修改', '返工', '反复'];
const highRiskReworkKeywords = ['还是', '仍然', '重新', '再改', '没改到', '返工', '反复'];
const statusDone = '完成归档';

function includesKeyword(text, keyword) {
  return String(text || '').toLowerCase().includes(String(keyword).toLowerCase());
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function percent(count, total) {
  return total ? Number(((count / total) * 100).toFixed(1)) : 0;
}

function isUnfinished(status) {
  return status !== statusDone;
}

function getIssueMatch(description) {
  const text = description || '';

  for (const rule of issueRules) {
    const matchedKeywords = rule.keywords.filter((keyword) => includesKeyword(text, keyword));
    if (matchedKeywords.length > 0) {
      return {
        issueCategory: rule.category,
        issueKeywords: matchedKeywords
      };
    }
  }

  return {
    issueCategory: '其他',
    issueKeywords: []
  };
}

function getUnclearReasons(description) {
  const text = description || '';
  return unclearRules
    .filter((rule) => rule.keywords.some((keyword) => includesKeyword(text, keyword)))
    .map((rule) => rule.reason);
}

function getMainKeyword(workorder) {
  return workorder.issueKeywords?.[0] || '';
}

function getErrorContentKey(workorder) {
  const base = [workorder.type || '未填写所属类型', workorder.issueCategory || '其他'];
  const mainKeyword = getMainKeyword(workorder);
  if (mainKeyword) base.push(mainKeyword);
  return base.join(' / ');
}

function buildKeyCounts(workorders) {
  return workorders.reduce((acc, item) => {
    const key = getErrorContentKey(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function getMatchedReworkKeywords(description, source = repeatedAdjustmentKeywords) {
  return source.filter((keyword) => includesKeyword(description, keyword));
}

function getRepeatedAdjustmentInfo(workorder, repeatedCount) {
  const reasons = [];
  const matchedKeywords = getMatchedReworkKeywords(workorder.description);

  if (repeatedCount >= 3) reasons.push('同类问题重复出现 3 次及以上');
  if (matchedKeywords.length > 0) reasons.push(`描述包含返工信号词：${matchedKeywords.join('、')}`);
  if (workorder.unclearReasons.length >= 2 && isUnfinished(workorder.status)) {
    reasons.push('需求不明确原因不少于 2 个且状态未完成');
  }

  return {
    isRepeatedAdjustmentCandidate: reasons.length > 0,
    repeatedAdjustmentReasons: reasons
  };
}

function getRiskInfo(workorder, repeatedCount) {
  const riskReasons = [];
  const highRiskKeywords = getMatchedReworkKeywords(workorder.description, highRiskReworkKeywords);

  if (!workorder.description) riskReasons.push('问题描述为空');
  if (workorder.unclearReasons.length >= 2) riskReasons.push(`命中 ${workorder.unclearReasons.length} 个需求不明确原因`);
  if (repeatedCount >= 3 && isUnfinished(workorder.status)) riskReasons.push('同类问题重复出现 3 次及以上且状态未完成');
  if (highRiskKeywords.length > 0) riskReasons.push(`描述包含明显返工词：${highRiskKeywords.join('、')}`);

  if (riskReasons.length > 0) return { riskLevel: '高', riskReasons };

  if (workorder.unclearReasons.length === 1) riskReasons.push('命中 1 个需求不明确原因');
  if (isUnfinished(workorder.status) && workorder.issueCategory !== '其他') riskReasons.push('状态未完成且问题已归类');
  if (repeatedCount === 2) riskReasons.push('同类问题重复出现 2 次');

  if (riskReasons.length > 0) return { riskLevel: '中', riskReasons };

  return { riskLevel: '低', riskReasons: ['未命中明显风险规则'] };
}

function buildSuggestions(workorder) {
  const suggestions = [];

  if (!workorder.description) suggestions.push('建议补充具体问题描述、题目位置、复现步骤和预期结果。');
  if (workorder.unclearReasons.includes('范围过大')) suggestions.push('建议明确具体讲次、题目、页面或修改范围，避免使用“全部/所有”等泛化描述。');
  if (workorder.unclearReasons.includes('参考旧版')) suggestions.push('建议补充旧版链接、截图或差异说明，明确到底参考哪里。');
  if (workorder.unclearReasons.includes('单条多需求')) suggestions.push('建议拆分为多个独立工单，降低遗漏和返工风险。');
  if (workorder.unclearReasons.includes('步骤依赖多')) suggestions.push('建议按处理顺序拆解步骤，并明确每一步的完成标准。');
  if (workorder.unclearReasons.includes('定位不具体')) suggestions.push('建议补充年级、周次、题目位置、截图或客户端路径，便于快速定位。');
  if (workorder.isRepeatedAdjustmentCandidate) suggestions.push('建议优先确认需求口径、验收标准和最终修改范围，避免继续反复调整。');
  if (workorder.riskLevel === '高' && isUnfinished(workorder.status)) suggestions.push('建议优先确认负责人、完成时间和当前阻塞点。');

  return uniq(suggestions);
}

export function analyzeWorkorders(workorders) {
  const withCategory = workorders.map((workorder) => {
    const issueMatch = getIssueMatch(workorder.description);
    const unclearReasons = getUnclearReasons(workorder.description);

    return {
      ...workorder,
      issueCategory: issueMatch.issueCategory,
      issueKeywords: issueMatch.issueKeywords,
      isUnclearRequirement: unclearReasons.length > 0,
      unclearReasons,
      riskLevel: '低',
      riskReasons: [],
      isRepeatedAdjustmentCandidate: false,
      repeatedAdjustmentReasons: [],
      suggestions: []
    };
  });

  const keyCounts = buildKeyCounts(withCategory);

  return withCategory.map((workorder) => {
    const repeatedCount = keyCounts[getErrorContentKey(workorder)] || 0;
    const repeatedInfo = getRepeatedAdjustmentInfo(workorder, repeatedCount);
    const riskInfo = getRiskInfo(workorder, repeatedCount);
    const analyzed = {
      ...workorder,
      ...riskInfo,
      ...repeatedInfo
    };

    return {
      ...analyzed,
      suggestions: buildSuggestions(analyzed)
    };
  });
}

function rankByField(workorders, field) {
  const counts = workorders.reduce((acc, item) => {
    const key = item[field] || '未填写';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function toCaseItem(item) {
  return {
    id: item.id,
    coursePosition: item.coursePosition,
    description: item.description,
    grade: item.grade,
    week: item.week,
    type: item.type,
    status: item.status,
    owner: item.owner,
    researcher: item.researcher,
    issueCategory: item.issueCategory,
    issueKeywords: item.issueKeywords,
    unclearReasons: item.unclearReasons,
    riskLevel: item.riskLevel,
    riskReasons: item.riskReasons,
    isUnclearRequirement: item.isUnclearRequirement,
    isRepeatedAdjustmentCandidate: item.isRepeatedAdjustmentCandidate,
    repeatedAdjustmentReasons: item.repeatedAdjustmentReasons,
    suggestions: item.suggestions,
    updatedAt: item.updatedAt
  };
}

function sortByPriority(a, b) {
  const riskScore = { 高: 3, 中: 2, 低: 1 };
  const score = (item) =>
    (item.isRepeatedAdjustmentCandidate ? 40 : 0) +
    (riskScore[item.riskLevel] || 0) * 10 +
    (item.isUnclearRequirement ? 20 : 0) +
    (isUnfinished(item.status) ? 10 : 0) +
    (item.unclearReasons?.length || 0) * 5;
  return score(b) - score(a);
}

function buildErrorContentRanking(workorders, totalCount) {
  const groups = new Map();

  workorders.forEach((item) => {
    const key = getErrorContentKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  return [...groups.entries()]
    .map(([name, items]) => ({
      name,
      count: items.length,
      percent: percent(items.length, totalCount),
      grades: uniq(items.map((item) => item.grade)).slice(0, 8),
      weeks: uniq(items.map((item) => item.week)).slice(0, 8),
      examples: items.toSorted(sortByPriority).slice(0, 3).map(toCaseItem)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function buildUnclearReasonRanking(workorders, totalCount) {
  const groups = new Map();

  workorders.forEach((item) => {
    item.unclearReasons.forEach((reason) => {
      if (!groups.has(reason)) groups.set(reason, []);
      groups.get(reason).push(item);
    });
  });

  return [...groups.entries()]
    .map(([reason, items]) => ({
      reason,
      name: reason,
      count: items.length,
      percent: percent(items.length, totalCount),
      examples: items.toSorted(sortByPriority).slice(0, 3).map(toCaseItem)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function buildRepeatedAdjustmentRanking(workorders, totalCount) {
  const groups = new Map();

  workorders
    .filter((item) => item.isRepeatedAdjustmentCandidate)
    .forEach((item) => {
      const reason = item.repeatedAdjustmentReasons[0] || getErrorContentKey(item);
      if (!groups.has(reason)) groups.set(reason, []);
      groups.get(reason).push(item);
    });

  return [...groups.entries()]
    .map(([name, items]) => ({
      name,
      count: items.length,
      percent: percent(items.length, totalCount),
      examples: items.toSorted(sortByPriority).slice(0, 3).map(toCaseItem)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function buildFocusWorkorders(workorders) {
  const seen = new Set();
  return workorders
    .filter((item) => item.isRepeatedAdjustmentCandidate || item.isUnclearRequirement || item.riskLevel === '高' || isUnfinished(item.status))
    .toSorted(sortByPriority)
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, 12)
    .map(toCaseItem);
}

function getTopIssueCategory(issueCategoryRanking) {
  return issueCategoryRanking.find((item) => item.name !== '其他')?.name || issueCategoryRanking[0]?.name || '';
}

function getClassificationWarning(issueCategoryRanking, totalCount) {
  const other = issueCategoryRanking.find((item) => item.name === '其他');
  if (!other || percent(other.value, totalCount) < 25) return '';
  return `有 ${other.value} 条工单被归为“其他”，占比 ${percent(other.value, totalCount)}%，建议优化分类规则。`;
}

export function buildStats(workorders) {
  const totalCount = workorders.length;
  const completedCount = workorders.filter((item) => item.status === statusDone).length;
  const unfinishedCount = totalCount - completedCount;
  const unclearCount = workorders.filter((item) => item.isUnclearRequirement).length;
  const repeatedAdjustmentCandidateCount = workorders.filter((item) => item.isRepeatedAdjustmentCandidate).length;
  const issueCategoryRanking = rankByField(workorders, 'issueCategory');

  return {
    totalCount,
    unfinishedCount,
    completionRate: percent(completedCount, totalCount),
    unclearCount,
    unclearRate: percent(unclearCount, totalCount),
    highRiskCount: workorders.filter((item) => item.riskLevel === '高').length,
    repeatedAdjustmentCandidateCount,
    repeatedAdjustmentRate: percent(repeatedAdjustmentCandidateCount, totalCount),
    topIssueCategory: getTopIssueCategory(issueCategoryRanking),
    classificationWarning: getClassificationWarning(issueCategoryRanking, totalCount),
    typeRanking: rankByField(workorders, 'type'),
    issueCategoryRanking,
    unclearReasonRanking: buildUnclearReasonRanking(workorders, totalCount),
    repeatedAdjustmentRanking: buildRepeatedAdjustmentRanking(workorders, totalCount),
    errorContentRanking: buildErrorContentRanking(workorders, totalCount),
    gradeRanking: rankByField(workorders, 'grade'),
    weekRanking: rankByField(workorders, 'week'),
    focusWorkorders: buildFocusWorkorders(workorders)
  };
}
