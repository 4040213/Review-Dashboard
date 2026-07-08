import { issueRules, getActiveIssueRules } from '../rules/issueRules.js';
import { unclearRules } from '../rules/riskRules.js';

const repeatedAdjustmentKeywords = ['还是', '仍然', '重新', '再改', '又', '没改到', '继续改', '二次修改', '返工', '反复'];
const highRiskReworkKeywords = ['还是', '仍然', '重新', '再改', '没改到', '返工', '反复'];
const statusDone = '完成归档';
const placeholderDescriptions = ['组课文档', '测试', '占位', '无', '暂无', '待补充', '-', '/'];
const validShortIssues = ['不对', '错了', '不显示', '不出现', '无法点击'];
const invalidTypeRules = [
  { type: 'collaboration_placeholder', keywords: ['组课文档', '课程文档', '教研文档'] },
  { type: 'test_data', keywords: ['测试', 'test', '调试', 'demo'] },
  { type: 'blank', keywords: ['无', '暂无', '-', '/', '待补充', '占位'] }
];
const reworkRootCauseRules = [
  { cause: 'unclear_requirement', check: (w) => w.isUnclearRequirement && w.isRepeatedAdjustmentCandidate },
  { cause: 'execution_gap', check: (w) => w.isRepeatedAdjustmentCandidate && !w.isUnclearRequirement },
  { cause: 'batch_issue', check: (w) => (w.issueKeywords?.length || 0) >= 2 && w.isRepeatedAdjustmentCandidate }
];

const statusGroupRules = [
  { group: '已归档', statuses: ['完成归档'] },
  { group: '待验收', statuses: ['待教研验收', '教研验收中'] },
  { group: '处理中', statuses: ['处理中', '待更新', '待测试', '待处理'] },
  { group: '暂停/挂起', statuses: ['暂停', '打包机挂起', '下期迭代'] }
];

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

function getStatusGroup(status) {
  return statusGroupRules.find((rule) => rule.statuses.includes(status))?.group || '其他';
}

function getIssueMatch(description, customRules) {
  const text = description || '';
  const rules = customRules || issueRules;
  for (const rule of rules) {
    if (!rule.keywords?.length) continue;
    const matchedKeywords = rule.keywords.filter((keyword) => includesKeyword(text, keyword));
    if (matchedKeywords.length > 0) return { issueCategory: rule.category, issueKeywords: matchedKeywords };
  }
  return { issueCategory: '其他', issueKeywords: [] };
}

function getUnclearReasons(description) {
  const text = description || '';
  return unclearRules.filter((rule) => rule.keywords.some((keyword) => includesKeyword(text, keyword))).map((rule) => rule.reason);
}

function getInvalidType(workorder) {
  const description = String(workorder.description || '').trim();
  if (!description) return 'blank';
  for (const rule of invalidTypeRules) {
    if (rule.keywords.some((kw) => includesKeyword(description, kw))) return rule.type;
  }
  // Only mark as incomplete if description is too short to be meaningful.
  // Missing coursePosition/type/status should NOT auto-invalidate — field
  // mapping may have failed due to different column names.
  if (description.length < 6 && !validShortIssues.includes(description)) return 'incomplete';
  return null;
}

function getReworkRootCause(workorder) {
  for (const rule of reworkRootCauseRules) {
    if (rule.check(workorder)) return { reworkRootCause: rule.cause };
  }
  return {};
}

function calcPassRateStats(workorders) {
  const valid = workorders.filter((w) => w.isValidForAnalysis);
  const archived = valid.filter((w) => w.status === statusDone);
  const everInReview = valid.filter((w) =>
    w.status === '待教研验收' || w.status === '教研验收中' || w.status === statusDone
  );
  const passRate = everInReview.length > 0 ? percent(archived.length, everInReview.length) : null;

  // Estimate rejections from status transitions
  let totalRejects = 0;
  valid.forEach((w) => {
    if (w.rejectCount) totalRejects += w.rejectCount;
  });

  return { passRate, passTotal: everInReview.length, totalRejects };
}

function getInvalidReasons(workorder) {
  const reasons = [];
  const description = String(workorder.description || '').trim();

  // Only description is truly critical — without it we can't analyze anything.
  // Other fields (coursePosition, type, status) enhance analysis but their
  // absence should NOT automatically invalidate the workorder.
  if (!description) {
    reasons.push('问题描述为空');
  }
  if (placeholderDescriptions.includes(description)) reasons.push('占位或非问题描述');
  if (description && description.length < 6 && !validShortIssues.includes(description) && !workorder.issueKeywords.length) reasons.push('描述过短且无法分类');

  // Only mark "无法归类" if description exists but is truly unclassifiable
  // AND there are no other signals at all
  if (description && !placeholderDescriptions.includes(description)
      && workorder.issueCategory === '其他'
      && workorder.issueKeywords.length === 0
      && workorder.unclearReasons.length === 0
      && description.length < 3) {
    reasons.push('无法归类且缺少关键词');
  }

  return uniq(reasons);
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
  if (workorder.unclearReasons.length >= 2 && isUnfinished(workorder.status)) reasons.push('需求不明确原因不少于 2 个且状态未完成');
  return { isRepeatedAdjustmentCandidate: reasons.length > 0, repeatedAdjustmentReasons: reasons };
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
  if (workorder.unclearReasons.includes('范围过大')) suggestions.push('建议明确具体讲次、题目、页面或修改范围。');
  if (workorder.unclearReasons.includes('参考旧版')) suggestions.push('建议补充旧版链接、截图或差异说明。');
  if (workorder.unclearReasons.includes('单条多需求')) suggestions.push('建议拆分为多个独立工单，降低遗漏和返工风险。');
  if (workorder.unclearReasons.includes('步骤依赖多')) suggestions.push('建议按处理顺序拆解步骤，并明确每一步完成标准。');
  if (workorder.unclearReasons.includes('定位不具体')) suggestions.push('建议补充年级、周次、题目位置、截图或客户端路径。');
  if (workorder.isRepeatedAdjustmentCandidate) suggestions.push('建议优先确认需求口径、验收标准和最终修改范围。');
  if (workorder.riskLevel === '高' && isUnfinished(workorder.status)) suggestions.push('建议优先确认负责人、完成时间和当前阻塞点。');
  return uniq(suggestions);
}

export function analyzeWorkorders(workorders, customRules) {
  const rules = customRules || null;

  const withCategory = workorders.map((workorder) => {
    const issueMatch = getIssueMatch(workorder.description, rules);
    const unclearReasons = getUnclearReasons(workorder.description);
    const base = { ...workorder, issueCategory: issueMatch.issueCategory, issueKeywords: issueMatch.issueKeywords, isUnclearRequirement: unclearReasons.length > 0, unclearReasons, statusGroup: getStatusGroup(workorder.status), riskLevel: '低', riskReasons: [], isRepeatedAdjustmentCandidate: false, repeatedAdjustmentReasons: [], suggestions: [], invalidType: null, reworkRootCause: null, reworkRootCauseReason: null };
    const invalidReasons = getInvalidReasons(base);
    const invalidType = invalidReasons.length > 0 ? getInvalidType(base) : null;
    return { ...base, isValidForAnalysis: invalidReasons.length === 0, invalidReasons, invalidType };
  });

  const validWorkorders = withCategory.filter((item) => item.isValidForAnalysis);
  const keyCounts = buildKeyCounts(validWorkorders);

  return withCategory.map((workorder) => {
    if (!workorder.isValidForAnalysis) {
      return { ...workorder, riskLevel: '低', riskReasons: ['无效工单不进入核心风险分析'], suggestions: ['建议补充完整字段或确认该记录是否为真实问题工单。'] };
    }
    const repeatedCount = keyCounts[getErrorContentKey(workorder)] || 0;
    const repeatedInfo = getRepeatedAdjustmentInfo(workorder, repeatedCount);
    const riskInfo = getRiskInfo(workorder, repeatedCount);
    const rootCauseInfo = repeatedInfo.isRepeatedAdjustmentCandidate ? getReworkRootCause({ ...workorder, ...riskInfo, ...repeatedInfo }) : {};
    const analyzed = { ...workorder, ...riskInfo, ...repeatedInfo, ...rootCauseInfo };
    return { ...analyzed, suggestions: buildSuggestions(analyzed) };
  });
}

function rankByField(workorders, field, nameKey = 'name') {
  const counts = workorders.reduce((acc, item) => {
    const key = item[field] || '未填写';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const total = workorders.length;
  return Object.entries(counts).map(([name, count]) => ({ [nameKey]: name, name, value: count, count, percent: percent(count, total) })).sort((a, b) => b.count - a.count);
}

function toCaseItem(item) {
  return { id: item.id, coursePosition: item.coursePosition, description: item.description, grade: item.grade, week: item.week, type: item.type, status: item.status, statusGroup: item.statusGroup, owner: item.owner, researcher: item.researcher, issueCategory: item.issueCategory, issueKeywords: item.issueKeywords, unclearReasons: item.unclearReasons, riskLevel: item.riskLevel, riskReasons: item.riskReasons, isUnclearRequirement: item.isUnclearRequirement, isRepeatedAdjustmentCandidate: item.isRepeatedAdjustmentCandidate, repeatedAdjustmentReasons: item.repeatedAdjustmentReasons, suggestions: item.suggestions, isValidForAnalysis: item.isValidForAnalysis, invalidReasons: item.invalidReasons, updatedAt: item.updatedAt, submittedAt: item.submittedAt, resolvedAt: item.resolvedAt, acceptedAt: item.acceptedAt, archivedAt: item.archivedAt };
}

function sortByPriority(a, b) {
  const riskScore = { 高: 3, 中: 2, 低: 1 };
  const score = (item) => (item.isRepeatedAdjustmentCandidate ? 40 : 0) + (riskScore[item.riskLevel] || 0) * 10 + (item.isUnclearRequirement ? 20 : 0) + (isUnfinished(item.status) ? 10 : 0) + (item.unclearReasons?.length || 0) * 5;
  return score(b) - score(a);
}

function buildErrorContentRanking(workorders, totalCount) {
  const groups = new Map();
  workorders.forEach((item) => {
    const key = getErrorContentKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  return [...groups.entries()].map(([name, items]) => ({ name, count: items.length, percent: percent(items.length, totalCount), grades: uniq(items.map((item) => item.grade)).slice(0, 8), weeks: uniq(items.map((item) => item.week)).slice(0, 8), examples: items.toSorted(sortByPriority).slice(0, 3).map(toCaseItem) })).sort((a, b) => b.count - a.count).slice(0, 10);
}

function buildUnclearReasonRanking(workorders, totalCount) {
  const groups = new Map();
  workorders.forEach((item) => item.unclearReasons.forEach((reason) => {
    if (!groups.has(reason)) groups.set(reason, []);
    groups.get(reason).push(item);
  }));
  return [...groups.entries()].map(([reason, items]) => ({ reason, name: reason, count: items.length, percent: percent(items.length, totalCount), examples: items.toSorted(sortByPriority).slice(0, 3).map(toCaseItem) })).sort((a, b) => b.count - a.count).slice(0, 10);
}

function buildRepeatedAdjustmentRanking(workorders, totalCount) {
  const groups = new Map();
  workorders.filter((item) => item.isRepeatedAdjustmentCandidate).forEach((item) => {
    const reason = item.repeatedAdjustmentReasons[0] || getErrorContentKey(item);
    if (!groups.has(reason)) groups.set(reason, []);
    groups.get(reason).push(item);
  });
  return [...groups.entries()].map(([name, items]) => ({ name, count: items.length, percent: percent(items.length, totalCount), examples: items.toSorted(sortByPriority).slice(0, 3).map(toCaseItem) })).sort((a, b) => b.count - a.count).slice(0, 10);
}

function buildFocusWorkorders(workorders) {
  const seen = new Set();
  return workorders.filter((item) => item.isValidForAnalysis && (item.isRepeatedAdjustmentCandidate || item.isUnclearRequirement || item.riskLevel === '高' || isUnfinished(item.status))).toSorted(sortByPriority).filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }).slice(0, 12).map(toCaseItem);
}

function getClassificationWarning(issueCategoryRanking, totalCount) {
  const other = issueCategoryRanking.find((item) => item.name === '其他');
  if (!other || percent(other.count, totalCount) < 25) return '';
  return `有 ${other.count} 条有效工单被归为“其他”，占比 ${percent(other.count, totalCount)}%，建议优化分类规则。`;
}

function buildTimeTrend(workorders) {
  const dateMap = new Map();
  workorders.forEach((w) => {
    const date = w.submittedAt || w.updatedAt;
    if (!date) return;
    const key = String(date).slice(0, 10);
    if (!dateMap.has(key)) dateMap.set(key, { date: key, count: 0, unclearCount: 0, highRiskCount: 0, archivedCount: 0 });
    const entry = dateMap.get(key);
    entry.count++;
    if (w.isUnclearRequirement) entry.unclearCount++;
    if (w.riskLevel === '高') entry.highRiskCount++;
    if (w.status === statusDone) entry.archivedCount++;
  });
  return [...dateMap.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function parseTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hoursBetween(a, b) {
  const start = parseTimestamp(a);
  const end = parseTimestamp(b);
  if (!start || !end || end <= start) return null;
  return Math.round(((end - start) / (1000 * 60 * 60)) * 10) / 10;
}

function formatDurationHours(hours) {
  if (hours === null || hours === undefined) return '-';
  if (hours < 1) return `${Math.round(hours * 60)} 分钟`;
  if (hours < 24) return `${Math.round(hours)} 小时`;
  const days = Math.floor(hours / 24);
  const remainHours = Math.round(hours % 24);
  return remainHours > 0 ? `${days} 天 ${remainHours} 小时` : `${days} 天`;
}

function buildDurationStats(workorders) {
  const withDurations = [];
  workorders.forEach((w) => {
    const endTime = w.archivedAt || w.resolvedAt || w.acceptedAt;
    const startTime = w.submittedAt;
    const hours = hoursBetween(startTime, endTime);
    if (hours !== null) withDurations.push({ ...w, durationHours: hours });
  });

  if (!withDurations.length) return [];

  const durations = withDurations.map((w) => w.durationHours).sort((a, b) => a - b);
  const avg = durations.reduce((s, d) => s + d, 0) / durations.length;
  const median = durations.length % 2 === 0
    ? (durations[durations.length / 2 - 1] + durations[durations.length / 2]) / 2
    : durations[Math.floor(durations.length / 2)];
  const max = durations[durations.length - 1];
  const min = durations[0];
  const p75 = durations[Math.floor(durations.length * 0.75)];
  const p90 = durations[Math.floor(durations.length * 0.9)];

  const stageStats = {};
  const stages = [
    { key: 'submitToResolve', label: '提交→解决', startField: 'submittedAt', endField: 'resolvedAt' },
    { key: 'resolveToAccept', label: '解决→验收', startField: 'resolvedAt', endField: 'acceptedAt' },
    { key: 'acceptToArchive', label: '验收→归档', startField: 'acceptedAt', endField: 'archivedAt' }
  ];

  stages.forEach(({ key, label, startField, endField }) => {
    const stageHours = workorders
      .map((w) => hoursBetween(w[startField], w[endField]))
      .filter((h) => h !== null);
    if (stageHours.length) {
      const sorted = [...stageHours].sort((a, b) => a - b);
      stageStats[key] = {
        label,
        count: stageHours.length,
        avg: Math.round((sorted.reduce((s, d) => s + d, 0) / sorted.length) * 10) / 10,
        median: Math.round((sorted[Math.floor(sorted.length / 2)]) * 10) / 10,
        max: Math.round(sorted[sorted.length - 1] * 10) / 10
      };
    }
  });

  return [{
    avg: Math.round(avg * 10) / 10,
    median: Math.round(median * 10) / 10,
    max: Math.round(max * 10) / 10,
    min: Math.round(min * 10) / 10,
    p75: Math.round(p75 * 10) / 10,
    p90: Math.round(p90 * 10) / 10,
    count: withDurations.length,
    avgFormatted: formatDurationHours(avg),
    medianFormatted: formatDurationHours(median),
    stageStats
  }];
}

function buildPendingDurationRanking(workorders) {
  const now = new Date();
  return workorders
    .filter((w) => w.isValidForAnalysis && w.status !== statusDone && w.submittedAt)
    .map((w) => {
      const hours = hoursBetween(w.submittedAt, now.toISOString());
      return { ...toCaseItem(w), pendingHours: hours ?? 0, pendingFormatted: formatDurationHours(hours ?? 0) };
    })
    .sort((a, b) => b.pendingHours - a.pendingHours)
    .slice(0, 10);
}

function buildTypicalCases(workorders) {
  const validWorkorders = workorders.filter((item) => item.isValidForAnalysis);
  return {
    highRiskCases: validWorkorders.filter((w) => w.riskLevel === '高').toSorted(sortByPriority).slice(0, 6).map(toCaseItem),
    unclearCases: validWorkorders.filter((w) => w.isUnclearRequirement).toSorted(sortByPriority).slice(0, 6).map(toCaseItem),
    repeatedAdjustmentCases: validWorkorders.filter((w) => w.isRepeatedAdjustmentCandidate).toSorted(sortByPriority).slice(0, 6).map(toCaseItem)
  };
}

function hasTimeData(workorders) {
  return workorders.some((item) => item.submittedAt || item.resolvedAt || item.acceptedAt || item.archivedAt);
}

export function buildStats(workorders) {
  const validWorkorders = workorders.filter((item) => item.isValidForAnalysis);
  const totalRawCount = workorders.length;
  const validAnalysisCount = validWorkorders.length;
  const invalidAnalysisCount = totalRawCount - validAnalysisCount;
  const unclearCount = validWorkorders.filter((item) => item.isUnclearRequirement).length;
  const repeatedCandidateCount = validWorkorders.filter((item) => item.isRepeatedAdjustmentCandidate).length;
  const archivedCount = validWorkorders.filter((item) => item.status === statusDone).length;
  const unfinishedCount = validAnalysisCount - archivedCount;
  const statusGroupRanking = rankByField(validWorkorders, 'statusGroup', 'group');
  const issueCategoryRanking = rankByField(validWorkorders, 'issueCategory');
  const timeTrend = buildTimeTrend(validWorkorders);
  const durationStats = buildDurationStats(validWorkorders);
  const passStats = calcPassRateStats(workorders);

  return {
    totalRawCount,
    totalCount: totalRawCount,
    validAnalysisCount,
    invalidAnalysisCount,
    unclearCount,
    unclearRate: percent(unclearCount, validAnalysisCount),
    passRate: passStats.passRate,
    passTotal: passStats.passTotal,
    totalRejects: passStats.totalRejects,
    repeatedCandidateCount,
    repeatedAdjustmentCandidateCount: repeatedCandidateCount,
    repeatedAdjustmentRate: percent(repeatedCandidateCount, validAnalysisCount),
    archivedCount,
    unfinishedCount,
    archiveRate: percent(archivedCount, validAnalysisCount),
    pendingAcceptanceCount: statusGroupRanking.find((item) => item.group === '待验收')?.count || 0,
    processingCount: statusGroupRanking.find((item) => item.group === '处理中')?.count || 0,
    suspendedCount: statusGroupRanking.find((item) => item.group === '暂停/挂起')?.count || 0,
    highRiskCount: validWorkorders.filter((item) => item.riskLevel === '高').length,
    classificationWarning: getClassificationWarning(issueCategoryRanking, validAnalysisCount),
    errorContentRanking: buildErrorContentRanking(validWorkorders, validAnalysisCount),
    unclearReasonRanking: buildUnclearReasonRanking(validWorkorders, validAnalysisCount),
    repeatedAdjustmentRanking: buildRepeatedAdjustmentRanking(validWorkorders, validAnalysisCount),
    statusRanking: rankByField(validWorkorders, 'status', 'status'),
    statusGroupRanking,
    typeRanking: rankByField(validWorkorders, 'type'),
    issueCategoryRanking,
    gradeRanking: rankByField(validWorkorders, 'grade'),
    weekRanking: rankByField(validWorkorders, 'week'),
    invalidReasonRanking: rankByField(workorders.flatMap((item) => item.invalidReasons.map((reason) => ({ reason }))), 'reason', 'reason'),
    focusWorkorders: buildFocusWorkorders(validWorkorders),
    typicalCases: buildTypicalCases(validWorkorders),
    timeTrend,
    durationStats,
    pendingDurationRanking: buildPendingDurationRanking(validWorkorders),
    hasTimeAnalysisData: hasTimeData(workorders)
  };
}
