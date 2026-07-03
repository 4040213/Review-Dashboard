/**
 * 生产指挥舱 — ETL 计算字段 & 聚合统计
 *
 * 在现有 analyzer 基础上，为每条工单追加指挥舱所需的计算字段，
 * 并产出4个Tab所需的聚合数据。
 */

// ── 常量 ──────────────────────────────────────────────

const STATUS_DONE = '完成归档';

/** 新版状态分组：未关闭 / 进行中 / 已关闭 */
const statusGroupV2Rules = [
  {
    group: '已关闭',
    statuses: ['完成归档', '下期迭代']
  },
  {
    group: '进行中',
    statuses: [] // 预留
  },
  {
    group: '未关闭',
    statuses: [
      '待教研验收', '教研验收中',
      '处理中', '待更新', '待测试', '待处理',
      '暂停', '打包机挂起'
    ]
  }
];

/** 类型大类映射关键词 */
const typeCategoryRules = [
  { category: '内容制作', keywords: ['组课文档', '莫顿场景', '剧情制作', '剧情', '场景', '组课'] },
  { category: '研发修改', keywords: ['演算板', '莫顿题', '挑战', '莫顿'] },
  { category: '媒体资源', keywords: ['视频', '音频', '音效', '语音'] }
];

/** 阻塞关键词 */
const blockingKeywords = ['阻断', '卡住', '无法'];

// ── 工具函数 ──────────────────────────────────────────

function includesKeyword(text, keyword) {
  return String(text || '').toLowerCase().includes(String(keyword).toLowerCase());
}

function dayDiff(dateStr1, dateStr2) {
  if (!dateStr1 || !dateStr2) return null;
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

function extractDate(dateStr) {
  if (!dateStr) return null;
  return String(dateStr).slice(0, 10);
}

function percent(count, total) {
  return total ? Number(((count / total) * 100).toFixed(1)) : 0;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function quartiles(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)] || 0;
  const q2 = median(sorted);
  const q3 = sorted[Math.floor(sorted.length * 0.75)] || 0;
  return { min: sorted[0] || 0, q1, median: q2, q3, max: sorted[sorted.length - 1] || 0 };
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stddev(values, avg) {
  if (values.length < 2) return 0;
  const m = avg ?? mean(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1));
}

// ── 单条工单计算字段 ─────────────────────────────────

function getStatusGroupV2(status) {
  for (const rule of statusGroupV2Rules) {
    if (rule.statuses.includes(status)) return rule.group;
  }
  return '未关闭';
}

function getTypeCategory(type, description = '') {
  const text = (type + ' ' + description).toLowerCase();
  for (const rule of typeCategoryRules) {
    if (rule.keywords.some((kw) => text.includes(kw.toLowerCase()))) {
      return rule.category;
    }
  }
  return '其他';
}

function getPrimaryResearcher(researcher) {
  if (!researcher) return '';
  // 逗号、顿号、换行分隔，取第一个
  return String(researcher).split(/[,，、\n]/)[0].trim();
}

/**
 * 为单条工单追加指挥舱计算字段
 */
export function enrichWorkorder(workorder, todayStr) {
  const today = todayStr || new Date().toISOString().slice(0, 10);
  const statusGroupV2 = getStatusGroupV2(workorder.status);
  const isArchived = workorder.status === STATUS_DONE || workorder.status === '下期迭代';
  const referenceDate = workorder.updatedAt || workorder.submittedAt;
  const dwellDays = !isArchived ? (dayDiff(referenceDate, today) ?? 0) : 0;
  const submittedOrUpdated = workorder.submittedAt || workorder.updatedAt;
  const lifecycleDays = isArchived ? (dayDiff(submittedOrUpdated, workorder.updatedAt || workorder.archivedAt) ?? null) : null;
  const isBlocking = includesKeyword(workorder.type, '阻断') ||
    blockingKeywords.some((kw) => includesKeyword(workorder.description, kw));
  const isAging = dwellDays > 5 && !isArchived;
  const typeCategory = getTypeCategory(workorder.type, workorder.description);
  const gradeWeek = workorder.grade && workorder.week ? `${workorder.grade}-${workorder.week}` : '';
  const reportDate = extractDate(workorder.submittedAt || workorder.updatedAt);
  const primaryResearcher = getPrimaryResearcher(workorder.researcher);

  return {
    ...workorder,
    statusGroupV2,
    dwellDays,
    lifecycleDays,
    isBlocking: isBlocking ? 1 : 0,
    isAging: isAging ? 1 : 0,
    typeCategory,
    gradeWeek,
    reportDate,
    primaryResearcher
  };
}

// ── 批量富化 ─────────────────────────────────────────

export function enrichWorkorders(workorders, todayStr) {
  return workorders.map((w) => enrichWorkorder(w, todayStr));
}

// ── 聚合统计：buildCommandCenterStats ─────────────────

/**
 * @param {Array} workorders - 已通过 analyzeWorkorders 富化的工单列表
 * @returns {Object} 四个 Tab 所需的全部数据
 */
export function buildCommandCenterStats(workorders) {
  const enriched = enrichWorkorders(workorders);
  const valid = enriched.filter((w) => w.isValidForAnalysis);
  const total = enriched.length;
  const validCount = valid.length;

  // ── Tab 1: 总览驾驶舱 ──
  const archived = valid.filter((w) => w.statusGroupV2 === '已关闭');
  const unclosed = valid.filter((w) => w.statusGroupV2 === '未关闭');
  const blocked = valid.filter((w) => w.isBlocking);
  const aging = valid.filter((w) => w.isAging);

  const completionRate = percent(archived.length, validCount);

  // 按新版状态分组统计
  const statusGroupV2Counts = {};
  for (const rule of statusGroupV2Rules) {
    statusGroupV2Counts[rule.group] = valid.filter((w) => w.statusGroupV2 === rule.group).length;
  }

  // 具体状态分布（用于下钻）
  const statusDetailCounts = {};
  valid.forEach((w) => {
    const s = w.status || '未知';
    statusDetailCounts[s] = (statusDetailCounts[s] || 0) + 1;
  });

  // 各年级工单密度
  const gradeDensity = {};
  const gradeWeekCounts = {};
  valid.forEach((w) => {
    if (w.grade) {
      gradeDensity[w.grade] = (gradeDensity[w.grade] || 0) + 1;
      if (w.week) {
        const key = `${w.grade}|${w.week}`;
        gradeWeekCounts[key] = (gradeWeekCounts[key] || 0) + 1;
      }
    }
  });

  // 各年级讲次数（用于计算平均密度）
  const gradeWeekSet = {};
  valid.forEach((w) => {
    if (w.grade && w.week) {
      if (!gradeWeekSet[w.grade]) gradeWeekSet[w.grade] = new Set();
      gradeWeekSet[w.grade].add(w.week);
    }
  });
  const gradeAvgDensity = {};
  for (const [grade, count] of Object.entries(gradeDensity)) {
    const weeks = gradeWeekSet[grade]?.size || 1;
    gradeAvgDensity[grade] = Number((count / weeks).toFixed(1));
  }
  const allAvgDensity = Object.values(gradeAvgDensity).reduce((s, v) => s + v, 0) /
    (Object.keys(gradeAvgDensity).length || 1);

  // 近14日吞吐趋势
  const today = new Date();
  const dailyData = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyData[key] = { date: key, newCount: 0, archivedCount: 0 };
  }

  enriched.forEach((w) => {
    const rDate = w.reportDate;
    if (rDate && dailyData[rDate]) dailyData[rDate].newCount++;
    if (w.statusGroupV2 === '已关闭') {
      const aDate = extractDate(w.updatedAt || w.archivedAt);
      if (aDate && dailyData[aDate]) dailyData[aDate].archivedCount++;
    }
  });

  const throughputTrend = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

  // BHI 计算
  const targetDailyClose = 5; // 目标日均归档数（可调）
  const recent7 = throughputTrend.slice(-7);
  const avgDailyClose7d = recent7.reduce((s, d) => s + d.archivedCount, 0) / 7;

  // 返修率：重复工单的课程节点数 / 总课程节点数
  const reworkNodes = new Set(
    valid.filter((w) => w.isRepeatedAdjustmentCandidate).map((w) => w.gradeWeek)
  );
  const allNodes = new Set(valid.filter((w) => w.gradeWeek).map((w) => w.gradeWeek));
  const reworkRate = allNodes.size > 0 ? reworkNodes.size / allNodes.size : 0;

  // 响应超时率：dwellDays > 2 视为超时
  const timeoutCount = valid.filter((w) => w.dwellDays > 2 && w.statusGroupV2 !== '已关闭').length;
  const timeoutRate = validCount > 0 ? timeoutCount / validCount : 0;

  const agingCount = aging.length;
  const pendingCount = unclosed.length;
  const bhi =
    0.30 * (pendingCount > 0 ? (1 - agingCount / pendingCount) : 1) +
    0.25 * Math.min(avgDailyClose7d / targetDailyClose, 1) -
    0.20 * reworkRate -
    0.25 * timeoutRate;

  const bhiClamped = Math.max(0, Math.min(1, Math.round(bhi * 1000) / 1000));

  const overview = {
    kpis: {
      totalWorkorders: total,
      validWorkorders: validCount,
      completionRate,
      unclosedCount: unclosed.length,
      blockedCount: blocked.length,
      agingCount: aging.length
    },
    bhi: bhiClamped,
    bhiDetail: { agingRatio: pendingCount > 0 ? agingCount / pendingCount : 0, avgDailyClose7d: Math.round(avgDailyClose7d * 10) / 10, targetDailyClose, reworkRate: Math.round(reworkRate * 1000) / 1000, timeoutRate: Math.round(timeoutRate * 1000) / 1000 },
    statusGroupV2: Object.entries(statusGroupV2Counts).map(([group, count]) => ({ group, count, percent: percent(count, validCount) })),
    statusDetail: Object.entries(statusDetailCounts).map(([status, count]) => ({ status, count, percent: percent(count, validCount) })).sort((a, b) => b.count - a.count),
    gradeDensity: Object.entries(gradeDensity).map(([grade, count]) => ({ grade, count, avgPerWeek: gradeAvgDensity[grade] || 0 })).sort((a, b) => b.count - a.count),
    allAvgDensity: Math.round(allAvgDensity * 10) / 10,
    throughputTrend
  };

  // ── Tab 2: 深度诊断 ──

  // 各状态停留时长分布（箱线图数据）
  const dwellByStatus = {};
  valid.forEach((w) => {
    const s = w.status || '未知';
    if (!dwellByStatus[s]) dwellByStatus[s] = [];
    dwellByStatus[s].push(w.dwellDays || 0);
  });
  const dwellBoxplot = Object.entries(dwellByStatus).map(([status, days]) => {
    const q = quartiles(days);
    return { status, ...q, mean: Math.round(mean(days) * 10) / 10, count: days.length };
  }).sort((a, b) => b.count - a.count);

  // 年级×讲次热力图
  const grades = [...new Set(valid.map((w) => w.grade).filter(Boolean))].sort();
  const weeks = [...new Set(valid.map((w) => w.week).filter(Boolean))].sort((a, b) => {
    const na = parseInt(a.replace(/[^0-9]/g, '')) || 0;
    const nb = parseInt(b.replace(/[^0-9]/g, '')) || 0;
    return na - nb;
  });
  const heatmapData = [];
  grades.forEach((grade) => {
    weeks.forEach((week) => {
      const key = `${grade}|${week}`;
      const count = gradeWeekCounts[key] || 0;
      heatmapData.push({ grade, week, count });
    });
  });

  // 工单类型大类×年级（堆积条形图）
  const typeCategories = ['内容制作', '研发修改', '媒体资源', '其他'];
  const typeByGrade = {};
  grades.forEach((grade) => {
    typeByGrade[grade] = {};
    typeCategories.forEach((tc) => { typeByGrade[grade][tc] = 0; });
  });
  valid.forEach((w) => {
    if (w.grade && typeByGrade[w.grade]) {
      typeByGrade[w.grade][w.typeCategory] = (typeByGrade[w.grade][w.typeCategory] || 0) + 1;
    }
  });
  const stackedTypeData = Object.entries(typeByGrade).map(([grade, tc]) => ({
    grade,
    ...tc,
    total: Object.values(tc).reduce((s, v) => s + v, 0)
  })).sort((a, b) => b.total - a.total);

  // 教研负责人负载
  const researcherLoad = {};
  valid.forEach((w) => {
    const p = w.primaryResearcher || '未分配';
    if (!researcherLoad[p]) researcherLoad[p] = { name: p, pending: 0, completed: 0, totalLifecycle: 0, completedCount: 0 };
    if (w.statusGroupV2 === '已关闭') {
      researcherLoad[p].completed++;
      if (w.lifecycleDays != null) {
        researcherLoad[p].totalLifecycle += w.lifecycleDays;
        researcherLoad[p].completedCount++;
      }
    } else {
      researcherLoad[p].pending++;
    }
  });
  const workloadData = Object.values(researcherLoad)
    .map((r) => ({
      ...r,
      avgCycle: r.completedCount > 0 ? Math.round((r.totalLifecycle / r.completedCount) * 10) / 10 : null,
      total: r.pending + r.completed
    }))
    .sort((a, b) => b.total - a.total);
  const avgWorkload = mean(workloadData.map((r) => r.total));

  // 已归档工单生命周期散点数据
  const lifecycleData = archived
    .filter((w) => w.lifecycleDays != null && w.reportDate)
    .map((w) => ({
      id: w.id,
      date: w.reportDate,
      days: w.lifecycleDays,
      gradeWeek: w.gradeWeek,
      type: w.typeCategory
    }));
  const lifecycleValues = lifecycleData.map((d) => d.days);
  const lifecycleMean = mean(lifecycleValues);
  const lifecycleStd = stddev(lifecycleValues, lifecycleMean);
  const lifecycleUcl = lifecycleMean + 3 * lifecycleStd;
  const lifecycleLcl = Math.max(0, lifecycleMean - 3 * lifecycleStd);

  const diagnostics = {
    dwellBoxplot,
    heatmap: { grades, weeks, data: heatmapData },
    stackedTypeData,
    typeCategories,
    workloadData,
    avgWorkload: Math.round(avgWorkload * 10) / 10,
    lifecycle: {
      data: lifecycleData,
      mean: Math.round(lifecycleMean * 10) / 10,
      std: Math.round(lifecycleStd * 10) / 10,
      ucl: Math.round(lifecycleUcl * 10) / 10,
      lcl: Math.round(lifecycleLcl * 10) / 10
    }
  };

  // ── Tab 3: 待办清单（优先级排序的工单列表）──
  const tasklistWorkorders = enriched
    .filter((w) => w.isValidForAnalysis)
    .map((w) => {
      // 优先级评分
      let priorityScore = 0;
      if (w.isBlocking) priorityScore += 100;
      if (w.isAging) priorityScore += 50;
      if (w.riskLevel === '高') priorityScore += 30;
      if (w.isRepeatedAdjustmentCandidate) priorityScore += 20;
      if (w.isUnclearRequirement) priorityScore += 10;
      priorityScore += Math.min(w.dwellDays || 0, 30);

      let priority = 'normal';
      if (w.isBlocking) priority = 'blocking';
      else if (w.isAging) priority = 'aging';

      // 操作建议
      let actionSuggestion = '';
      const tc = w.typeCategory;
      const type = (w.type || '').toLowerCase();
      if (tc === '研发修改' || type.includes('演算板')) actionSuggestion = '演算板→@汪新权';
      else if (tc === '媒体资源' || type.includes('视频')) actionSuggestion = '视频→@马荣蓉';
      else if (tc === '内容制作') actionSuggestion = '内容→@教研负责人';
      else actionSuggestion = '请确认负责人';

      return {
        id: w.id,
        priority,
        priorityScore,
        gradeWeek: w.gradeWeek,
        description: w.description,
        type: w.type,
        typeCategory: w.typeCategory,
        status: w.status,
        statusGroupV2: w.statusGroupV2,
        dwellDays: w.dwellDays,
        researcher: w.researcher,
        primaryResearcher: w.primaryResearcher,
        updatedAt: w.updatedAt,
        isBlocking: w.isBlocking,
        isAging: w.isAging,
        riskLevel: w.riskLevel,
        actionSuggestion
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const tasklist = {
    workorders: tasklistWorkorders,
    total: tasklistWorkorders.length,
    filters: {
      grades: [...new Set(tasklistWorkorders.map((w) => w.gradeWeek?.split('-')[0]).filter(Boolean))].sort(),
      weeks: [...new Set(tasklistWorkorders.map((w) => w.gradeWeek?.split('-')[1]).filter(Boolean))].sort(),
      statuses: [...new Set(tasklistWorkorders.map((w) => w.status).filter(Boolean))].sort(),
      researchers: [...new Set(tasklistWorkorders.map((w) => w.primaryResearcher).filter(Boolean))].sort()
    }
  };

  // ── Tab 4: 预测与趋势 ──

  // 近30日流入流出平衡
  const daily30 = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    daily30[key] = { date: key, newCount: 0, archivedCount: 0 };
  }
  enriched.forEach((w) => {
    const rDate = w.reportDate;
    if (rDate && daily30[rDate]) daily30[rDate].newCount++;
    if (w.statusGroupV2 === '已关闭') {
      const aDate = extractDate(w.updatedAt || w.archivedAt);
      if (aDate && daily30[aDate]) daily30[aDate].archivedCount++;
    }
  });

  const inflowOutflow = Object.values(daily30).sort((a, b) => a.date.localeCompare(b.date));
  let cumNew = 0;
  let cumArchived = 0;
  const cumData = inflowOutflow.map((d) => {
    cumNew += d.newCount;
    cumArchived += d.archivedCount;
    return { date: d.date, newCount: d.newCount, archivedCount: d.archivedCount, cumNew, cumArchived };
  });

  // 日均归档率
  const recent7CC = cumData.slice(-7);
  const avgArchived7d = recent7CC.reduce((s, d) => s + d.archivedCount, 0) / 7;
  const recent14CC = cumData.slice(-14);
  const avgArchived14d = recent14CC.reduce((s, d) => s + d.archivedCount, 0) / 14;

  // 剩余清空预测
  const remainingUnclosed = unclosed.length;
  const optimisticDays = avgArchived7d > 0 ? Math.ceil(remainingUnclosed / (avgArchived7d * 1.2)) : null;
  const neutralDays = avgArchived7d > 0 ? Math.ceil(remainingUnclosed / avgArchived7d) : null;
  const pessimisticDays = avgArchived7d > 0 ? Math.ceil(remainingUnclosed / (avgArchived7d * 0.8)) : null;

  const forecastCompletion = {
    remainingUnclosed,
    avgDailyArchive7d: Math.round(avgArchived7d * 10) / 10,
    avgDailyArchive14d: Math.round(avgArchived14d * 10) / 10,
    optimistic: optimisticDays,
    neutral: neutralDays,
    pessimistic: pessimisticDays,
    deadlineDate: '2026-07-10'
  };

  // 各类型剩余工作量和平均处理时长（气泡图）
  const typeEffort = {};
  typeCategories.forEach((tc) => { typeEffort[tc] = { days: [], remaining: 0 }; });
  valid.forEach((w) => {
    const tc = w.typeCategory;
    if (typeEffort[tc]) {
      if (w.statusGroupV2 !== '已关闭') typeEffort[tc].remaining++;
      if (w.lifecycleDays != null) typeEffort[tc].days.push(w.lifecycleDays);
    }
  });
  const bubbleData = Object.entries(typeEffort).map(([tc, data]) => ({
    type: tc,
    avgDays: data.days.length > 0 ? Math.round(mean(data.days) * 10) / 10 : 0,
    remaining: data.remaining,
    estimatedPersonDays: Math.round((data.days.length > 0 ? mean(data.days) : 1) * data.remaining)
  }));

  const forecast = {
    daily30: cumData,
    forecastCompletion,
    bubbleData
  };

  return { overview, diagnostics, tasklist, forecast, _meta: { computedAt: new Date().toISOString(), totalWorkorders: total, validWorkorders: validCount } };
}
