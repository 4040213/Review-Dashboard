/**
 * Tab 2: 深度诊断 — 工单类型大类×年级堆积柱状图
 */
import ReactECharts from 'echarts-for-react';
import { buildStackedBarOption } from '../charts/commandCenterCharts.js';

export default function TypeStackedBar({ stackedTypeData, typeCategories }) {
  const option = buildStackedBarOption(
    stackedTypeData || [],
    typeCategories || ['内容制作', '研发修改', '媒体资源', '其他']
  );

  return (
    <div className="cc-chart-card">
      <ReactECharts option={option} style={{ height: 340 }} />
    </div>
  );
}
