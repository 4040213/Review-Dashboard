import ReactECharts from 'echarts-for-react';
import { baseChartOption, chartColors } from './charts/chartTheme.js';

function buildTrendOption(timeTrend = []) {
  const safeData = timeTrend.length ? timeTrend : [];
  const dates = safeData.map((item) => item.date);
  const totalData = safeData.map((item) => item.count);
  const unclearData = safeData.map((item) => item.unclearCount);
  const highRiskData = safeData.map((item) => item.highRiskCount);
  const archivedData = safeData.map((item) => item.archivedCount);

  return {
    ...baseChartOption,
    tooltip: {
      ...baseChartOption.tooltip,
      trigger: 'axis',
      formatter: (params) => {
        const date = params[0]?.axisValue || '';
        return params
          .filter((p) => p.value > 0)
          .map((p) => `<span style="display:inline-block;margin-right:6px;border-radius:50%;width:8px;height:8px;background:${p.color}"></span>${p.seriesName}：${p.value} 条`)
          .join('<br/>') || `${date}<br/>暂无数据`;
      }
    },
    grid: { top: 56, left: 12, right: 28, bottom: 18, containLabel: true },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { color: 'var(--text-secondary)', rotate: dates.length > 12 ? 45 : 0, fontSize: 'var(--fs-overline)' },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: 'var(--text-secondary)' },
      splitLine: { lineStyle: { color: '#E8E0DE' } }
    },
    series: [
      { name: '总工单', type: 'line', data: totalData, smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2.5, color: chartColors.blue }, itemStyle: { color: chartColors.blue }, areaStyle: { color: 'rgba(40, 120, 255, 0.06)' } },
      { name: '已归档', type: 'line', data: archivedData, smooth: true, symbol: 'diamond', symbolSize: 4, lineStyle: { width: 2, color: chartColors.green, type: 'dashed' }, itemStyle: { color: chartColors.green } },
      { name: '需求不明确', type: 'line', data: unclearData, smooth: true, symbol: 'triangle', symbolSize: 4, lineStyle: { width: 2, color: chartColors.orange }, itemStyle: { color: chartColors.orange } },
      { name: '高风险', type: 'line', data: highRiskData, smooth: true, symbol: 'rect', symbolSize: 3, lineStyle: { width: 2, color: chartColors.red }, itemStyle: { color: chartColors.red } }
    ]
  };
}

function StageCard({ stage }) {
  return (
    <div className="stage-card">
      <span className="stage-label">{stage.label}</span>
      <strong>{stage.avg} 小时</strong>
      <div className="stage-details">
        <span>中位数 {stage.median}h</span>
        <span>最长 {stage.max}h</span>
      </div>
      <em>{stage.count} 条有数据</em>
    </div>
  );
}

function PendingRow({ item, index }) {
  return (
    <article className="pending-row">
      <span className="pending-index">{index + 1}</span>
      <div className="pending-body">
        <p className="pending-desc">{item.description || '未填写问题描述'}</p>
        <div className="pending-meta">
          <span>{item.status || '-'}</span>
          <span>{item.owner || '-'}</span>
          <span>提交于 {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString('zh-CN') : '-'}</span>
        </div>
      </div>
      <strong className="pending-hours">{item.pendingFormatted || '-'}</strong>
    </article>
  );
}

export default function TimeAnalysis({ stats }) {
  const timeTrend = stats.timeTrend || [];
  const durationStats = stats.durationStats?.[0] || null;
  const stageStats = durationStats?.stageStats || {};
  const pendingRanking = stats.pendingDurationRanking || [];
  const hasTrend = timeTrend.length >= 2;
  const hasDuration = durationStats && durationStats.count > 0;
  const hasPending = pendingRanking.length > 0;
  const hasAnyData = hasTrend || hasDuration || hasPending;

  return (
    <section className="panel time-analysis-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Time Analysis</p>
          <h2>工单流转时间分析</h2>
          <p className="muted">
            {hasAnyData
              ? '基于工单提交时间、解决时间和归档时间，分析处理效率与积压情况。'
              : '当前数据源未提供工单提出/解决/验收/归档时间字段，请通过 Excel 增加对应字段或接入飞书 API。'}
          </p>
        </div>
        {hasDuration && (
          <span className="count-badge">平均 {durationStats.avgFormatted}</span>
        )}
      </div>

      {!hasAnyData ? (
        <div className="time-empty-state">
          请在 Excel 中增加「工单提出时间」「工单解决时间」「工单验收时间」「工单归档时间」字段，或通过飞书多维表格 API 读取状态流转时间。
        </div>
      ) : (
        <div className="time-analysis-grid">
          {hasTrend && (
            <div className="time-trend-card">
              <div className="time-card-title">
                <h3>工单趋势</h3>
                <p>按提交/更新日期聚合总量、归档、需求不明确和高风险趋势</p>
              </div>
              <ReactECharts option={buildTrendOption(timeTrend)} style={{ height: 280 }} />
            </div>
          )}

          {hasDuration && (
            <div className="time-duration-card">
              <div className="time-card-title">
                <h3>处理时长统计（提交→归档/解决）</h3>
                <p>基于 {durationStats.count} 条有时间记录的已完成工单</p>
              </div>
              <div className="duration-stats-grid">
                <div className="duration-stat-item">
                  <span>平均</span>
                  <strong>{durationStats.avgFormatted}</strong>
                </div>
                <div className="duration-stat-item">
                  <span>中位数</span>
                  <strong>{durationStats.medianFormatted}</strong>
                </div>
                <div className="duration-stat-item">
                  <span>最短</span>
                  <strong>{durationStats.min} 小时</strong>
                </div>
                <div className="duration-stat-item">
                  <span>最长</span>
                  <strong>{durationStats.max} 小时</strong>
                </div>
                <div className="duration-stat-item">
                  <span>P75</span>
                  <strong>{durationStats.p75} 小时</strong>
                </div>
                <div className="duration-stat-item">
                  <span>P90</span>
                  <strong>{durationStats.p90} 小时</strong>
                </div>
              </div>
              {Object.keys(stageStats).length > 0 && (
                <div className="stage-stats-row">
                  {Object.values(stageStats).map((stage) => (
                    <StageCard stage={stage} key={stage.key || stage.label} />
                  ))}
                </div>
              )}
            </div>
          )}

          {hasPending && (
            <div className="time-pending-card">
              <div className="time-card-title">
                <h3>积压时长 Top 10</h3>
                <p>按提交时间至今的等待时长排序，优先关注积压最久的未完成工单</p>
              </div>
              <div className="pending-list">
                {pendingRanking.map((item, index) => (
                  <PendingRow item={item} index={index} key={item.id} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
