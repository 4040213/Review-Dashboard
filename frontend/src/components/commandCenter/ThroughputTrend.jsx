/**
 * Tab 1: 总览驾驶舱 — 近14日工单吞吐趋势 + 汇总
 * 若无真实数据则自动生成 fallback 模拟数据
 */
import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Icon } from '@iconify/react';
import { buildThroughputComboOption } from '../charts/commandCenterCharts.js';

/** 生成一组带随机波动的模拟吞吐数据 */
function generateMockThroughput(dates) {
  const baseNew = 40 + Math.floor(Math.random() * 30);      // 基数 40~70
  const baseArchived = 35 + Math.floor(Math.random() * 25); // 基数 35~60
  return dates.map((date, i) => {
    const trendFactor = 1 + i * 0.03; // 轻微上升趋势
    return {
      date,
      newCount: Math.max(0, Math.round((baseNew + (Math.random() - 0.5) * 20) * trendFactor)),
      archivedCount: Math.max(0, Math.round((baseArchived + (Math.random() - 0.5) * 16) * trendFactor)),
    };
  });
}

export default function ThroughputTrend({ throughputTrend }) {
  const rawData = throughputTrend || [];
  const hasRealData = rawData.some(d => (d.newCount || 0) > 0 || (d.archivedCount || 0) > 0);

  // 若无真实数据，使用模拟数据并在控制台告警
  const data = useMemo(() => {
    if (!hasRealData && rawData.length > 0) {
      console.warn('[ThroughputTrend] API 返回的吞吐量数据全为零，使用模拟数据代替。');
      const dates = rawData.map(d => d.date);
      return generateMockThroughput(dates);
    }
    return rawData;
  }, [rawData, hasRealData]);

  const option = useMemo(() => buildThroughputComboOption(data), [data]);

  const totalNew = data.reduce((s, d) => s + (d.newCount || 0), 0);
  const totalArchived = data.reduce((s, d) => s + (d.archivedCount || 0), 0);
  const netChange = totalNew - totalArchived;
  const avgNewPerDay = data.length > 0 ? Math.round(totalNew / data.length) : 0;

  return (
    <div className="cc-chart-card">
      <ReactECharts option={option} style={{ height: 260 }} />

      {/* 模拟数据标记 */}
      {!hasRealData && rawData.length > 0 && (
        <div style={{
          textAlign: 'center', fontSize: 'var(--fs-micro)', color: 'var(--gold)',
          padding: '2px 0', fontStyle: 'italic'
        }}>
          <Icon icon="mdi:information-outline" width={11} height={11} style={{verticalAlign:'middle',marginRight:3}} />
          当前显示模拟数据 — 真实吞吐量需工单包含提交/归档时间字段
        </div>
      )}

      {/* 汇总统计行 */}
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
