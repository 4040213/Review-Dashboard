/**
 * 生产指挥舱 — ECharts 图表构建器
 *
 * 遵循现有 Charts.jsx 的模式：每个函数返回一个 ECharts option 对象。
 * 使用 cmdColors 和 typeCategoryColors 作为颜色规范。
 */

import { cmdColors, typeCategoryColors, statusGroupV2Colors, glassTooltip, baseChartOption } from './chartTheme.js';

// ── 工具函数 ──────────────────────────────────────────

function getValue(item) {
  return item.value ?? item.count ?? 0;
}

function normalizeData(data = []) {
  return [...data]
    .map((item) => ({
      name: item.name || item.status || item.group || item.grade || item.reason || item.type || '',
      value: getValue(item),
      percent: item.percent,
      ...item
    }))
    .sort((a, b) => b.value - a.value);
}

// ── 仪表盘 (Gauge) ─────────────────────────────────────

export function buildGaugeOption(value, title = 'BHI 看板健康指数') {
  const pct = Math.round(value * 100);
  return {
    series: [{
      type: 'gauge',
      center: ['50%', '58%'],
      radius: '85%',
      startAngle: 220,
      endAngle: -40,
      min: 0,
      max: 100,
      splitNumber: 10,
      axisLine: {
        show: true,
        lineStyle: {
          width: 22,
          color: [
            [0.3, cmdColors.red],
            [0.6, cmdColors.orange],
            [0.8, cmdColors.brand],
            [1, cmdColors.green]
          ]
        }
      },
      pointer: { width: 6, length: '65%', itemStyle: { color: cmdColors.text } },
      axisTick: { distance: -22, length: 8, lineStyle: { width: 1, color: '#A0908E' } },
      splitLine: { distance: -26, length: 18, lineStyle: { width: 3, color: '#A0908E' } },
      axisLabel: { color: cmdColors.textSecondary, distance: 30, fontSize: 12 },
      anchor: { show: true, showAbove: true, size: 20, itemStyle: { borderWidth: 2 } },
      title: { offsetCenter: [0, '82%'], fontSize: 14, color: cmdColors.textSecondary },
      detail: {
        valueAnimation: true,
        fontSize: 44,
        fontWeight: 800,
        color: cmdColors.text,
        offsetCenter: [0, '42%'],
        formatter: '{value}'
      },
      data: [{ value: pct, name: title }]
    }]
  };
}

// ── 环形图 (Donut) ─────────────────────────────────────

export function buildDonutOption(title, data, colorMap = statusGroupV2Colors) {
  const safeData = normalizeData(data).slice(0, 10);
  const colors = safeData.map((d) => colorMap[d.name] || cmdColors.brand);
  return {
    color: colors,
    title: { text: title, left: 'center', top: 6, textStyle: { color: cmdColors.text, fontSize: 15, fontWeight: 800 } },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
      borderColor: 'rgba(255, 255, 255, 0.8)',
      borderWidth: 1,
      textStyle: { color: cmdColors.text },
      extraCssText: 'backdrop-filter: blur(18px); border-radius: 14px; box-shadow: 0 12px 32px rgba(222,16,32,0.06);',
      formatter: '{b}<br/>数量：{c} 条<br/>占比：{d}%'
    },
    legend: {
      type: 'scroll', orient: 'vertical', right: 4, top: 44, bottom: 10,
      textStyle: { color: cmdColors.textSecondary, fontSize: 11 }
    },
    series: [{
      name: title, type: 'pie',
      radius: ['48%', '72%'],
      center: ['36%', '56%'],
      data: safeData,
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 13, fontWeight: 'bold' },
        itemStyle: { shadowBlur: 16, shadowOffsetX: 0, shadowColor: 'rgba(222, 16, 32, 0.1)' }
      },
      itemStyle: { borderColor: 'rgba(255,255,255,0.9)', borderWidth: 2, borderRadius: 4 }
    }]
  };
}

// ── 水平柱状图 ────────────────────────────────────────

export function buildHorizontalBarOption(title, data, color = cmdColors.brand, markLineValue = null) {
  const visibleData = normalizeData(data).slice(0, 12);
  const safeData = visibleData.length ? visibleData : [{ name: '暂无数据', value: 0 }];

  const option = {
    ...baseChartOption,
    title: { text: title, left: 0, top: 0, textStyle: { color: cmdColors.text, fontSize: 15, fontWeight: 800 } },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
      borderColor: 'rgba(255, 255, 255, 0.8)',
      borderWidth: 1,
      textStyle: { color: cmdColors.text, fontSize: 13 },
      extraCssText: 'backdrop-filter: blur(18px); border-radius: 14px; box-shadow: 0 12px 32px rgba(222,16,32,0.06);',
      formatter: (params) => {
        const item = Array.isArray(params) ? params[0] : params;
        const dataItem = safeData.find((entry) => entry.name === item.name);
        return `<b>${item.name}</b><br/>数量：<b>${item.value}</b> 条${dataItem?.percent !== undefined ? `<br/>占比：${dataItem.percent}%` : ''}`;
      }
    },
    grid: { top: 40, left: 140, right: 52, bottom: 20, containLabel: true },
    xAxis: {
      type: 'value', minInterval: 1,
      axisLabel: { color: cmdColors.textSecondary, fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.15)', type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: safeData.map((item) => item.name).reverse(),
      axisLabel: { color: cmdColors.text, fontSize: 12, width: 128, overflow: 'truncate' },
      axisTick: { show: false },
      axisLine: { show: false }
    },
    series: [{
      type: 'bar',
      data: safeData.map((item) => item.value).reverse(),
      barMaxWidth: 22,
      label: { show: true, position: 'right', color: cmdColors.text, fontWeight: 700, fontSize: 12 },
      itemStyle: { color, borderRadius: [0, 8, 8, 0] },
      emphasis: {
        itemStyle: { color, shadowBlur: 12, shadowColor: color + '40' },
        label: { fontSize: 13 }
      }
    }]
  };

  if (markLineValue != null) {
    option.series[0].markLine = {
      silent: true,
      data: [{ xAxis: markLineValue, label: { formatter: `均值: ${markLineValue}`, color: cmdColors.textSecondary }, lineStyle: { color: cmdColors.orange, type: 'dashed', width: 2 } }]
    };
  }

  return option;
}

// ── 柱线组合图 (新vs归档吞吐趋势) ──────────────────────

export function buildThroughputComboOption(data) {
  if (!data?.length) return {};
  const dates = data.map((d) => d.date);
  const newVals = data.map((d) => d.newCount || 0);
  const archivedVals = data.map((d) => d.archivedCount || 0);
  const netVals = data.map((d, i) => {
    let net = 0;
    for (let j = 0; j <= i; j++) net += (data[j].newCount || 0) - (data[j].archivedCount || 0);
    return net;
  });

  return {
    ...baseChartOption,
    title: { text: '近14日工单吞吐趋势', left: 0, top: 0, textStyle: { color: cmdColors.text, fontSize: 15, fontWeight: 800 } },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
      borderColor: 'rgba(255, 255, 255, 0.8)',
      borderWidth: 1,
      textStyle: { color: cmdColors.text, fontSize: 13 },
      extraCssText: 'backdrop-filter: blur(18px); border-radius: 14px; box-shadow: 0 12px 32px rgba(222,16,32,0.06);'
    },
    legend: { data: ['新增工单', '归档工单', '净增趋势'], top: 6, textStyle: { color: cmdColors.textSecondary, fontSize: 11 } },
    grid: { top: 60, left: 44, right: 60, bottom: 32, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: cmdColors.textSecondary, fontSize: 10, rotate: 30 },
      axisTick: { show: false }
    },
    yAxis: [
      { type: 'value', name: '数量', nameTextStyle: { color: cmdColors.textSecondary, fontSize: 11 }, axisLabel: { color: cmdColors.textSecondary, fontSize: 11 }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)', type: 'dashed' } } },
      { type: 'value', name: '净增', nameTextStyle: { color: cmdColors.textSecondary, fontSize: 11 }, axisLabel: { color: cmdColors.textSecondary, fontSize: 11 }, splitLine: { show: false } }
    ],
    series: [
      { name: '新增工单', type: 'bar', data: newVals, barMaxWidth: 20, itemStyle: { color: cmdColors.brand, borderRadius: [6, 6, 0, 0] } },
      { name: '归档工单', type: 'bar', data: archivedVals, barMaxWidth: 20, itemStyle: { color: cmdColors.green, borderRadius: [6, 6, 0, 0] } },
      { name: '净增趋势', type: 'line', yAxisIndex: 1, data: netVals, smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { width: 2, color: cmdColors.orange }, itemStyle: { color: cmdColors.orange }, markLine: { silent: true, data: [{ yAxis: 0, lineStyle: { color: cmdColors.red, type: 'dashed' } }] } }
    ]
  };
}

// ── 热力图 (Heatmap) ───────────────────────────────────

export function buildHeatmapOption(data, xLabels, yLabels, title = '年级×讲次工单密度') {
  const maxCount = Math.max(...data.map((d) => d.count || d[2] || 0), 1);
  const seriesData = data.map((d) => {
    const gradeIdx = yLabels.indexOf(d.grade || d[1]);
    const weekIdx = xLabels.indexOf(d.week || d[0]);
    const count = d.count ?? d[2] ?? 0;
    return [weekIdx, gradeIdx, count];
  });

  return {
    ...baseChartOption,
    title: { text: title, left: 'center', top: 4, textStyle: { color: cmdColors.text, fontSize: 15, fontWeight: 800 } },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
      borderColor: 'rgba(255, 255, 255, 0.8)',
      borderWidth: 1,
      textStyle: { color: cmdColors.text, fontSize: 13 },
      extraCssText: 'backdrop-filter: blur(18px); border-radius: 14px; box-shadow: 0 12px 32px rgba(222,16,32,0.06);',
      formatter: (params) => `${yLabels[params.value[1]]} - ${xLabels[params.value[0]]}<br/>工单数：<b>${params.value[2]}</b>`
    },
    grid: { top: 40, left: 100, right: 60, bottom: 60 },
    xAxis: {
      type: 'category', data: xLabels, position: 'top',
      axisLabel: { color: cmdColors.textSecondary, fontSize: 11 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'category', data: yLabels,
      axisLabel: { color: cmdColors.text, fontSize: 12 },
      axisTick: { show: false }
    },
    visualMap: {
      min: 0, max: maxCount,
      calculable: true,
      orient: 'vertical',
      right: 4, top: 40, bottom: 20,
      inRange: { color: ['#FFF9F8', '#FDE8EC', 'var(--brand)', '#B80D1A'] },
      textStyle: { color: cmdColors.textSecondary }
    },
    series: [{
      type: 'heatmap',
      data: seriesData,
      label: { show: true, color: cmdColors.text, fontSize: 11 },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.2)' } }
    }]
  };
}

// ── 箱线图 ─────────────────────────────────────────────

export function buildBoxplotOption(data, title = '各状态停留时长分布') {
  const statuses = data.map((d) => d.status);
  const boxData = data.map((d) => [d.min, d.q1, d.median, d.q3, d.max]);
  const meanData = data.map((d) => d.mean);

  return {
    ...baseChartOption,
    title: { text: title, left: 0, top: 0, textStyle: { color: cmdColors.text, fontSize: 15, fontWeight: 800 } },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
      borderColor: 'rgba(255, 255, 255, 0.8)',
      borderWidth: 1,
      textStyle: { color: cmdColors.text, fontSize: 13 },
      extraCssText: 'backdrop-filter: blur(18px); border-radius: 14px;',
      formatter: (params) => {
        if (params.seriesName === '均值') return `<b>${params.name}</b><br/>均值：${params.value} 天`;
        const d = data[params.dataIndex];
        return `<b>${params.name}</b><br/>最小：${d.min}天<br/>Q1：${d.q1}天<br/>中位数：${d.median}天<br/>Q3：${d.q3}天<br/>最大：${d.max}天<br/>均值：${d.mean}天<br/>工单数：${d.count}`;
      }
    },
    grid: { top: 40, left: 120, right: 40, bottom: 40 },
    xAxis: {
      type: 'category', data: statuses,
      axisLabel: { color: cmdColors.text, fontSize: 11, rotate: 20 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value', name: '天数',
      nameTextStyle: { color: cmdColors.textSecondary },
      axisLabel: { color: cmdColors.textSecondary, fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)', type: 'dashed' } }
    },
    series: [
      {
        name: '分布', type: 'boxplot',
        data: boxData,
        itemStyle: { color: cmdColors.brand, borderColor: cmdColors.brand },
        emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(222,16,32,0.3)' } }
      },
      {
        name: '均值', type: 'scatter',
        data: meanData,
        symbolSize: 10,
        itemStyle: { color: cmdColors.red },
        markLine: { silent: true, symbol: 'none', data: [{ yAxis: 5, label: { formatter: '警戒线 5天' }, lineStyle: { color: cmdColors.red, type: 'dashed', width: 2 } }] }
      }
    ]
  };
}

// ── 堆积柱状图 ────────────────────────────────────────

export function buildStackedBarOption(data, categories, title = '工单类型×年级分布') {
  const grades = data.map((d) => d.grade);
  const colors = categories.map((c) => typeCategoryColors[c] || cmdColors.gray);

  const series = categories.map((cat) => ({
    name: cat,
    type: 'bar',
    stack: 'total',
    data: data.map((d) => d[cat] || 0),
    itemStyle: { color: typeCategoryColors[cat] || cmdColors.gray, borderRadius: 0 },
    emphasis: { focus: 'series' },
    barMaxWidth: 28
  }));

  return {
    ...baseChartOption,
    color: colors,
    title: { text: title, left: 0, top: 0, textStyle: { color: cmdColors.text, fontSize: 15, fontWeight: 800 } },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
      borderColor: 'rgba(255, 255, 255, 0.8)',
      borderWidth: 1,
      textStyle: { color: cmdColors.text, fontSize: 13 },
      extraCssText: 'backdrop-filter: blur(18px); border-radius: 14px;'
    },
    legend: { top: 4, textStyle: { color: cmdColors.textSecondary, fontSize: 11 } },
    grid: { top: 50, left: 44, right: 40, bottom: 32, containLabel: true },
    xAxis: {
      type: 'category', data: grades,
      axisLabel: { color: cmdColors.text, fontSize: 12 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: cmdColors.textSecondary, fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)', type: 'dashed' } }
    },
    series
  };
}

// ── 负载柱状图 (堆积: 已完成+未归档 + 均值参考线) ──────

export function buildWorkloadBarOption(data, avgWorkload, title = '教研负责人负载') {
  const names = data.map((d) => d.name);
  const completed = data.map((d) => d.completed || 0);
  const pending = data.map((d) => d.pending || 0);

  return {
    ...baseChartOption,
    title: { text: title, left: 0, top: 0, textStyle: { color: cmdColors.text, fontSize: 15, fontWeight: 800 } },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
      borderColor: 'rgba(255, 255, 255, 0.8)',
      borderWidth: 1,
      textStyle: { color: cmdColors.text, fontSize: 13 },
      extraCssText: 'backdrop-filter: blur(18px); border-radius: 14px;',
      formatter: (params) => {
        const name = params[0].axisValue;
        const d = data.find((item) => item.name === name);
        let html = `<b>${name}</b><br/>`;
        params.forEach((p) => { html += `${p.marker} ${p.seriesName}：${p.value} 条<br/>`; });
        if (d?.avgCycle) html += `平均处理周期：${d.avgCycle} 天`;
        return html;
      }
    },
    legend: { data: ['已完成', '未归档'], top: 4, textStyle: { color: cmdColors.textSecondary, fontSize: 11 } },
    grid: { top: 50, left: 44, right: 40, bottom: 60, containLabel: true },
    xAxis: {
      type: 'category', data: names,
      axisLabel: { color: cmdColors.text, fontSize: 11, rotate: 30 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: cmdColors.textSecondary, fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)', type: 'dashed' } }
    },
    series: [
      { name: '已完成', type: 'bar', stack: 'load', data: completed, itemStyle: { color: cmdColors.green, borderRadius: [0, 0, 0, 0] }, barMaxWidth: 32 },
      { name: '未归档', type: 'bar', stack: 'load', data: pending, itemStyle: { color: cmdColors.orange, borderRadius: [6, 6, 0, 0] }, barMaxWidth: 32,
        markLine: {
          silent: true,
          data: [{ yAxis: avgWorkload, label: { formatter: `平均: ${avgWorkload}`, color: cmdColors.textSecondary }, lineStyle: { color: cmdColors.red, type: 'dashed', width: 2 } }]
        }
      }
    ]
  };
}

// ── 散点图 (生命周期 + 控制限) ─────────────────────────

export function buildLifecycleScatterOption(lifecycleData, title = '工单处理周期分析') {
  const dates = [...new Set(lifecycleData.data.map((d) => d.date))].sort();
  const scatterData = lifecycleData.data.map((d) => ({
    value: [d.date, d.days],
    id: d.id,
    gradeWeek: d.gradeWeek,
    type: d.type
  }));

  const mean = lifecycleData.mean;
  const ucl = lifecycleData.ucl;
  const lcl = lifecycleData.lcl;

  return {
    ...baseChartOption,
    title: { text: title, left: 0, top: 0, textStyle: { color: cmdColors.text, fontSize: 15, fontWeight: 800 } },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
      borderColor: 'rgba(255, 255, 255, 0.8)',
      borderWidth: 1,
      textStyle: { color: cmdColors.text, fontSize: 13 },
      extraCssText: 'backdrop-filter: blur(18px); border-radius: 14px;',
      formatter: (params) => {
        const d = params.value;
        return `<b>${d[0]}</b><br/>工单ID：${params.data.id}<br/>周期：<b>${d[1]}</b> 天<br/>讲次：${params.data.gradeWeek}<br/>类型：${params.data.type}`;
      }
    },
    grid: { top: 40, left: 50, right: 30, bottom: 50 },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: cmdColors.textSecondary, fontSize: 10, rotate: 30 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value', name: '生命周期(天)',
      nameTextStyle: { color: cmdColors.textSecondary },
      axisLabel: { color: cmdColors.textSecondary, fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)', type: 'dashed' } }
    },
    series: [{
      type: 'scatter',
      data: scatterData,
      symbolSize: 8,
      itemStyle: { color: cmdColors.brand, opacity: 0.7 },
      emphasis: { itemStyle: { color: cmdColors.red, opacity: 1 }, symbolSize: 14 },
      markLine: {
        silent: true,
        symbol: 'none',
        data: [
          { yAxis: mean, label: { formatter: `均值: ${mean}天` }, lineStyle: { color: cmdColors.brand, type: 'solid', width: 2 } },
          { yAxis: ucl, label: { formatter: `UCL: ${ucl}天` }, lineStyle: { color: cmdColors.red, type: 'dashed', width: 1.5 } },
          { yAxis: lcl, label: { formatter: `LCL: ${lcl}天` }, lineStyle: { color: cmdColors.red, type: 'dashed', width: 1.5 } }
        ]
      }
    }]
  };
}

// ── 气泡图 ─────────────────────────────────────────────

export function buildBubbleOption(data, title = '各类型工单剩余工作量') {
  const maxSize = Math.max(...data.map((d) => d.estimatedPersonDays || 1), 1);

  const bubbleData = data.map((d) => ({
    value: [d.avgDays, d.remaining, d.estimatedPersonDays],
    name: d.type
  }));

  const colors = data.map((d) => typeCategoryColors[d.type] || cmdColors.gray);

  return {
    ...baseChartOption,
    color: colors,
    title: { text: title, left: 0, top: 0, textStyle: { color: cmdColors.text, fontSize: 15, fontWeight: 800 } },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
      borderColor: 'rgba(255, 255, 255, 0.8)',
      borderWidth: 1,
      textStyle: { color: cmdColors.text, fontSize: 13 },
      extraCssText: 'backdrop-filter: blur(18px); border-radius: 14px;',
      formatter: (params) => {
        const d = data.find((item) => item.type === params.name);
        return `<b>${params.name}</b><br/>平均处理时长：${d?.avgDays || 0} 天<br/>剩余数量：${d?.remaining || 0} 条<br/>预估人天：<b>${d?.estimatedPersonDays || 0}</b>`;
      }
    },
    grid: { top: 36, left: 60, right: 30, bottom: 40 },
    xAxis: {
      type: 'value', name: '平均处理时长(天)',
      nameTextStyle: { color: cmdColors.textSecondary, fontSize: 11 },
      axisLabel: { color: cmdColors.textSecondary, fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)', type: 'dashed' } }
    },
    yAxis: {
      type: 'value', name: '剩余数量',
      nameTextStyle: { color: cmdColors.textSecondary, fontSize: 11 },
      axisLabel: { color: cmdColors.textSecondary, fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)', type: 'dashed' } }
    },
    series: [{
      type: 'scatter',
      data: bubbleData,
      symbolSize: (val) => Math.max(15, Math.sqrt(val[2] / maxSize) * 50),
      itemStyle: { opacity: 0.8, borderColor: '#fff', borderWidth: 2 },
      emphasis: { itemStyle: { opacity: 1 }, scale: 1.5 },
      label: { show: true, formatter: '{b}', position: 'inside', color: '#fff', fontSize: 11, fontWeight: 700 }
    }]
  };
}

// ── 面积图 (流入流出平衡) ──────────────────────────────

export function buildAreaCompareOption(data, title = '工单流入-流出平衡') {
  if (!data?.length) return {};
  const dates = data.map((d) => d.date);
  const cumNew = data.map((d) => d.cumNew || 0);
  const cumArchived = data.map((d) => d.cumArchived || 0);

  return {
    ...baseChartOption,
    title: { text: title, left: 0, top: 0, textStyle: { color: cmdColors.text, fontSize: 15, fontWeight: 800 } },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
      borderColor: 'rgba(255, 255, 255, 0.8)',
      borderWidth: 1,
      textStyle: { color: cmdColors.text, fontSize: 13 },
      extraCssText: 'backdrop-filter: blur(18px); border-radius: 14px;'
    },
    legend: { data: ['累计新增', '累计归档'], top: 4, textStyle: { color: cmdColors.textSecondary, fontSize: 11 } },
    grid: { top: 50, left: 50, right: 30, bottom: 32 },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: cmdColors.textSecondary, fontSize: 10, rotate: 30 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: cmdColors.textSecondary, fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)', type: 'dashed' } }
    },
    series: [
      {
        name: '累计新增', type: 'line', data: cumNew,
        smooth: true, symbol: 'none',
        lineStyle: { width: 2.5, color: cmdColors.brand },
        areaStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: cmdColors.brand + '40' }, { offset: 1, color: cmdColors.brand + '05' }] }
        }
      },
      {
        name: '累计归档', type: 'line', data: cumArchived,
        smooth: true, symbol: 'none',
        lineStyle: { width: 2.5, color: cmdColors.green },
        areaStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: cmdColors.green + '40' }, { offset: 1, color: cmdColors.green + '05' }] }
        }
      }
    ]
  };
}

// ── 预测线图 (完成预测 乐观/中性/悲观) ──────────────────

export function buildForecastLineOption(data, title = '剩余工单清空预测') {
  const { remainingUnclosed, avgDailyArchive7d, optimistic, neutral, pessimistic, deadlineDate } = data;
  if (!neutral) return {};

  const today = new Date();
  const days = Array.from({ length: Math.max(pessimistic || 0, neutral || 0, optimistic || 0) + 5 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const makeLine = (rate) => {
    let remaining = remainingUnclosed;
    return days.map(() => {
      const val = remaining;
      remaining = Math.max(0, remaining - rate);
      return val;
    });
  };

  const neutralLine = makeLine(avgDailyArchive7d);
  const optimisticLine = makeLine(avgDailyArchive7d * 1.2);
  const pessimisticLine = makeLine(avgDailyArchive7d * 0.8);
  const deadlineIdx = days.findIndex((d) => d >= deadlineDate);

  return {
    ...baseChartOption,
    title: { text: title, left: 0, top: 0, textStyle: { color: cmdColors.text, fontSize: 15, fontWeight: 800 } },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
      borderColor: 'rgba(255, 255, 255, 0.8)',
      borderWidth: 1,
      textStyle: { color: cmdColors.text, fontSize: 13 },
      extraCssText: 'backdrop-filter: blur(18px); border-radius: 14px;'
    },
    legend: { data: ['乐观预测', '中性预测', '悲观预测'], top: 4, textStyle: { color: cmdColors.textSecondary, fontSize: 11 } },
    grid: { top: 50, left: 50, right: 30, bottom: 32 },
    xAxis: {
      type: 'category', data: days,
      axisLabel: { color: cmdColors.textSecondary, fontSize: 10, rotate: 30 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value', name: '剩余工单',
      axisLabel: { color: cmdColors.textSecondary, fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)', type: 'dashed' } }
    },
    series: [
      { name: '乐观预测', type: 'line', data: optimisticLine, smooth: true, symbol: 'none', lineStyle: { width: 2, color: cmdColors.green, type: 'dashed' }, areaStyle: { color: cmdColors.green + '15' } },
      { name: '中性预测', type: 'line', data: neutralLine, smooth: true, symbol: 'none', lineStyle: { width: 2.5, color: cmdColors.brand }, areaStyle: { color: cmdColors.brand + '15' } },
      { name: '悲观预测', type: 'line', data: pessimisticLine, smooth: true, symbol: 'none', lineStyle: { width: 2, color: cmdColors.orange, type: 'dashed' }, areaStyle: { color: cmdColors.orange + '15' } }
    ]
  };
}
