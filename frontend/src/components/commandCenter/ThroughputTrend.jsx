/**
 * Tab 1: 总览驾驶舱 — 近14日工单吞吐趋势 + 汇总
 *
 * 数据完全由后端 commandCenterEtl 计算，不再使用模拟数据。
 * 若时间字段缺失导致全零，则显示明确的空状态指引。
 * 支持前后翻页查看历史周期数据。
 */
import { useMemo, useState, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { Icon } from '@iconify/react';
import { buildThroughputComboOption } from '../charts/commandCenterCharts.js';

/** 偏移若干天后的日期范围（YYYY-MM-DD） */
function getDateRange(offsetDays = 0, windowSize = 14) {
  const today = new Date();
  const days = [];
  for (let i = windowSize - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i + offsetDays);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

const WINDOW_PRESETS = [
  { label: '7天', value: 7 },
  { label: '14天', value: 14 },
  { label: '30天', value: 30 },
  { label: '90天', value: 90 },
];

export default function ThroughputTrend({ throughputTrend, dateRange }) {
  // ── 周期偏移（用于历史翻页）──
  const [offsetDays, setOffsetDays] = useState(0);
  const [windowSize, setWindowSize] = useState(14);

  const handlePrev = useCallback(() => setOffsetDays((o) => o - windowSize), [windowSize]);
  const handleNext = useCallback(() => setOffsetDays((o) => Math.min(0, o + windowSize)), [windowSize]);
  const handleReset = useCallback(() => setOffsetDays(0), []);

  const handleWindowSizeChange = useCallback((size) => {
    setWindowSize(size);
    setOffsetDays(0); // 切换窗口大小时重置到最新
  }, []);

  // ── 数据匹配 ──
  const rawData = throughputTrend || [];
  const dateLabels = getDateRange(offsetDays, windowSize);

  // 将后端数据对齐到当前显示的日期范围
  const alignedData = useMemo(() => {
    if (!rawData.length) {
      return dateLabels.map((d) => ({ date: d, newCount: 0, archivedCount: 0 }));
    }
    // 如果后端返回的日期与 dateLabels 匹配，直接使用
    const dateSet = new Set(rawData.map((r) => r.date));
    const hasOverlap = dateLabels.some((d) => dateSet.has(d));
    if (hasOverlap) {
      return dateLabels.map((d) => {
        const found = rawData.find((r) => r.date === d);
        return found || { date: d, newCount: 0, archivedCount: 0 };
      });
    }
    return rawData;
  }, [rawData, dateLabels]);

  const hasAnyData = alignedData.some((d) => (d.newCount || 0) > 0 || (d.archivedCount || 0) > 0);
  const isHistorical = offsetDays < 0;

  const option = useMemo(() => buildThroughputComboOption(alignedData, windowSize), [alignedData, windowSize]);

  // ── 汇总统计 ──
  const totalNew = alignedData.reduce((s, d) => s + (d.newCount || 0), 0);
  const totalArchived = alignedData.reduce((s, d) => s + (d.archivedCount || 0), 0);
  const netChange = totalNew - totalArchived;
  const avgNewPerDay = alignedData.length > 0 ? Math.round(totalNew / alignedData.length) : 0;

  const periodLabel = useMemo(() => {
    if (!alignedData.length) return '';
    const first = alignedData[0].date;
    const last = alignedData[alignedData.length - 1].date;
    return `${first} ~ ${last}`;
  }, [alignedData]);

  const windowLabel = `${windowSize}日`;

  return (
    <div className="cc-chart-card">
      {/* ── 标题栏 + 周期导航 ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontWeight: 800, fontSize: 'var(--fs-body)', color: 'var(--text-primary)' }}>
          近{windowLabel}工单吞吐趋势
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* 窗口大小选择器 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginRight: 8 }}>
            {WINDOW_PRESETS.map((preset) => (
              <button
                key={preset.value}
                className="cc-period-btn"
                onClick={() => handleWindowSizeChange(preset.value)}
                title={`查看近${preset.label}数据`}
                style={{
                  border: 'none',
                  background: windowSize === preset.value ? 'var(--brand)' : 'var(--bg-subtle)',
                  color: windowSize === preset.value ? '#fff' : 'var(--text-secondary)',
                  borderRadius: 6,
                  padding: '2px 8px',
                  cursor: 'pointer',
                  fontSize: 'var(--fs-micro)',
                  fontWeight: windowSize === preset.value ? 600 : 400,
                  transition: 'all 0.15s ease',
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <button
            className="cc-period-btn"
            onClick={handlePrev}
            title="查看前一周期的数据"
            style={{ border: 'none', background: 'var(--bg-subtle)', borderRadius: 6, padding: '2px 6px', cursor: 'pointer', fontSize: 'var(--fs-micro)', color: 'var(--text-secondary)' }}
          >
            <Icon icon="mdi:chevron-left" width={14} height={14} />
          </button>
          <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-muted)', minWidth: 120, textAlign: 'center' }}>{periodLabel}</span>
          <button
            className="cc-period-btn"
            onClick={handleNext}
            disabled={offsetDays >= 0}
            title="返回最近周期"
            style={{ border: 'none', background: 'var(--bg-subtle)', borderRadius: 6, padding: '2px 6px', cursor: offsetDays < 0 ? 'pointer' : 'default', fontSize: 'var(--fs-micro)', color: offsetDays < 0 ? 'var(--text-secondary)' : 'var(--text-muted)', opacity: offsetDays < 0 ? 1 : 0.4 }}
          >
            <Icon icon="mdi:chevron-right" width={14} height={14} />
          </button>
          {isHistorical && (
            <span
              onClick={handleReset}
              title="回到最近周期"
              style={{ fontSize: 'var(--fs-micro)', color: 'var(--brand)', cursor: 'pointer', marginLeft: 2 }}
            >
              回到今天
            </span>
          )}
        </div>
      </div>

      {/* ── 图表区 ── */}
      {hasAnyData ? (
        <ReactECharts option={option} style={{ height: 260 }} />
      ) : (
        <div className="cc-empty-chart" style={{
          height: 260, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', gap: 8
        }}>
          <Icon icon="mdi:chart-line-variant" width={40} height={40} style={{ opacity: 0.4 }} />
          <div style={{ fontSize: 'var(--fs-body-sm)', fontWeight: 600 }}>
            {rawData.length === 0
              ? '暂无吞吐数据'
              : isHistorical
                ? '该周期内无工单活动'
                : '当前周期内无工单活动'}
          </div>
          <div style={{ fontSize: 'var(--fs-micro)', maxWidth: 280, textAlign: 'center', lineHeight: 1.4 }}>
            {rawData.length === 0
              ? '请通过飞书同步或 Excel 上传导入工单数据，确保工单包含提交时间或更新时间字段。'
              : '工单的提交/归档时间字段可能缺失，请在飞书表格中检查"工单提出时间""最后更新时间"等字段是否填写。'}
          </div>
          {isHistorical && (
            <span onClick={handleReset} style={{ fontSize: 'var(--fs-caption)', color: 'var(--brand)', cursor: 'pointer', textDecoration: 'underline' }}>
              返回最近14天
            </span>
          )}
        </div>
      )}

      {/* ── 汇总统计行 ── */}
      <div style={{
        display: 'flex', gap: 12, justifyContent: 'center',
        padding: '10px 0 0', borderTop: '1px solid var(--border-subtle)',
        marginTop: 4
      }}>
        {[
          { label: '周期内新增', value: totalNew, icon: 'mdi:plus-circle-outline', color: 'var(--brand)' },
          { label: '周期内归档', value: totalArchived, icon: 'mdi:check-circle-outline', color: 'var(--green)' },
          { label: '净变化', value: (netChange >= 0 ? '+' : '') + netChange, icon: 'mdi:swap-vertical', color: netChange >= 0 ? 'var(--red)' : 'var(--green)' },
          { label: '日均新增', value: avgNewPerDay, icon: 'mdi:calendar-month-outline', color: 'var(--gold)' },
        ].map((item) => (
          <div key={item.label} style={{
            textAlign: 'center', flex: 1,
            padding: '6px 8px', borderRadius: 8,
            background: '#FFFDFC', border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginBottom: 2 }}>
              <Icon icon={item.icon} width={12} height={12} style={{ color: item.color }} />
              <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-muted)' }}>{item.label}</span>
            </div>
            <div style={{ fontSize: 'var(--fs-h2)', fontWeight: 'var(--fw-bold)', color: item.color, lineHeight: 1.2 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
