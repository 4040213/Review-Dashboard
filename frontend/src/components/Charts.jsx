import ReactECharts from 'echarts-for-react';

function getValue(item) {
  return item.value ?? item.count ?? 0;
}

function buildBarOption(title, data, color = '#2878ff') {
  const visibleData = (data?.length ? data : [{ name: '暂无数据', value: 0 }]).slice(0, 10);
  const horizontal = visibleData.length > 8;

  const commonAxis = {
    axisLabel: {
      color: '#667085',
      width: 96,
      overflow: 'truncate'
    },
    axisTick: { show: false }
  };

  return {
    title: {
      text: title,
      left: 8,
      top: 4,
      textStyle: {
        color: '#101828',
        fontSize: 15,
        fontWeight: 800
      }
    },
    grid: {
      left: horizontal ? 112 : 36,
      right: 20,
      top: 54,
      bottom: horizontal ? 22 : 46
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    xAxis: horizontal
      ? {
          type: 'value',
          minInterval: 1,
          axisLabel: { color: '#667085' },
          splitLine: { lineStyle: { color: '#edf0f5' } }
        }
      : {
          type: 'category',
          data: visibleData.map((item) => item.name),
          ...commonAxis,
          axisLabel: {
            ...commonAxis.axisLabel,
            interval: 0,
            rotate: visibleData.length > 5 ? 24 : 0
          }
        },
    yAxis: horizontal
      ? {
          type: 'category',
          data: visibleData.map((item) => item.name).reverse(),
          ...commonAxis
        }
      : {
          type: 'value',
          minInterval: 1,
          axisLabel: { color: '#667085' },
          splitLine: { lineStyle: { color: '#edf0f5' } }
        },
    series: [
      {
        type: 'bar',
        data: horizontal ? visibleData.map(getValue).reverse() : visibleData.map(getValue),
        barMaxWidth: 30,
        itemStyle: {
          color,
          borderRadius: horizontal ? [0, 8, 8, 0] : [8, 8, 0, 0]
        }
      }
    ]
  };
}

export default function Charts({ stats }) {
  const chartItems = [
    { title: '所属类型排行', data: stats.typeRanking, color: '#2878ff' },
    { title: '问题一级分类排行', data: stats.issueCategoryRanking, color: '#7c3aed' },
    { title: '年级问题分布', data: stats.gradeRanking, color: '#12b76a' },
    { title: '周次问题分布', data: stats.weekRanking, color: '#06aed4' }
  ];

  return (
    <section className="panel charts-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Supporting Charts</p>
          <h2>辅助分析图表</h2>
          <p className="muted">图表用于辅助查看类型、分类、年级和周次分布，核心结论以上方排行卡片为准。</p>
        </div>
      </div>
      <div className="charts-grid inner-charts-grid">
        {chartItems.map((item) => (
          <div className="chart-card compact-chart-card" key={item.title}>
            <ReactECharts option={buildBarOption(item.title, item.data, item.color)} style={{ height: 260 }} />
          </div>
        ))}
      </div>
    </section>
  );
}
