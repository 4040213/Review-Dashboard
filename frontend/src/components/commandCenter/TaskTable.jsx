/**
 * Tab 3: 待办工单清单 — 优先级排序表格
 */
import { useState, useMemo } from 'react';
import { cmdColors, typeCategoryColors } from '../charts/chartTheme.js';

function getPriorityLabel(priority) {
  switch (priority) {
    case 'blocking': return { icon: '🔴', label: '阻断', color: cmdColors.red };
    case 'aging': return { icon: '🟠', label: '高龄', color: cmdColors.orange };
    default: return { icon: '🟡', label: '普通', color: cmdColors.textSecondary };
  }
}

function getTypeColor(typeCategory) {
  return typeCategoryColors[typeCategory] || cmdColors.other;
}

function getStatusColor(statusGroupV2) {
  if (statusGroupV2 === '已关闭') return cmdColors.green;
  if (statusGroupV2 === '未关闭') return cmdColors.red;
  return cmdColors.orange;
}

export default function TaskTable({ workorders, filters, onFilterChange }) {
  const [sortField, setSortField] = useState('priorityScore');
  const [sortDir, setSortDir] = useState('desc');

  // Apply local filters
  const filtered = useMemo(() => {
    let result = workorders || [];
    if (filters?.onlyUnclosed) {
      result = result.filter((w) => w.statusGroupV2 !== '已关闭');
    }
    if (filters?.keyword) {
      const kw = filters.keyword.toLowerCase();
      result = result.filter((w) =>
        (w.description || '').toLowerCase().includes(kw) ||
        (w.gradeWeek || '').toLowerCase().includes(kw)
      );
    }
    return result;
  }, [workorders, filters]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [filtered, sortField, sortDir]);

  function handleSort(field) {
    if (sortField === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  function copyAgingIds() {
    const ids = sorted
      .filter((w) => w.dwellDays > 5 && w.statusGroupV2 !== '已关闭')
      .map((w) => w.id)
      .join(', ');
    if (ids) {
      navigator.clipboard.writeText(ids).then(() => alert(`已复制高龄工单ID：${ids}`));
    } else {
      alert('无高龄工单');
    }
  }

  function exportCSV() {
    const headers = ['优先级', 'ID', '年级-讲次', '问题描述', '类型', '状态', '停留天数', '负责人', '操作建议'];
    const rows = sorted.map((w) => [
      getPriorityLabel(w.priority).label, w.id, w.gradeWeek,
      `"${(w.description || '').replace(/"/g, '""')}"`,
      w.typeCategory, w.status, w.dwellDays, w.primaryResearcher, w.actionSuggestion
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `待办工单_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const sortArrow = (field) => {
    if (sortField !== field) return ' ↕';
    return sortDir === 'desc' ? ' ↓' : ' ↑';
  };

  return (
    <div className="cc-task-table-wrap">
      {/* Quick Actions */}
      <div className="cc-task-actions">
        <button className="secondary-button" onClick={exportCSV}>📥 导出今日待办清单</button>
        <button className="secondary-button" onClick={copyAgingIds}>📋 一键复制高龄工单ID</button>
        <span className="cc-task-count">共 {sorted.length} 条工单</span>
      </div>

      {/* Table */}
      <div className="cc-table-scroll">
        <table className="cc-task-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('priorityScore')} style={{ width: 60 }}>优先级{sortArrow('priorityScore')}</th>
              <th style={{ width: 60 }}>ID</th>
              <th style={{ width: 110 }}>年级-讲次</th>
              <th style={{ minWidth: 200 }}>问题描述</th>
              <th style={{ width: 80 }}>类型</th>
              <th style={{ width: 80 }}>状态</th>
              <th onClick={() => handleSort('dwellDays')} style={{ width: 70 }}>停留{sortArrow('dwellDays')}</th>
              <th style={{ width: 80 }}>负责人</th>
              <th style={{ width: 140 }}>操作建议</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((w) => {
              const priority = getPriorityLabel(w.priority);
              return (
                <tr key={w.id} className={w.isBlocking ? 'cc-row-blocking' : w.isAging ? 'cc-row-aging' : ''}>
                  <td><span style={{ color: priority.color }}>{priority.icon} {priority.label}</span></td>
                  <td>{w.id}</td>
                  <td>{w.gradeWeek}</td>
                  <td className="cc-desc-cell" title={w.description}>
                    {(w.description || '').length > 60
                      ? w.description.slice(0, 60) + '...'
                      : w.description}
                  </td>
                  <td>
                    <span className="cc-type-tag" style={{ background: getTypeColor(w.typeCategory) + '20', color: getTypeColor(w.typeCategory) }}>
                      {w.typeCategory}
                    </span>
                  </td>
                  <td>
                    <span className="cc-status-tag" style={{ background: getStatusColor(w.statusGroupV2) + '20', color: getStatusColor(w.statusGroupV2) }}>
                      {w.status}
                    </span>
                  </td>
                  <td style={{ color: w.dwellDays > 5 ? cmdColors.red : cmdColors.text, fontWeight: w.dwellDays > 5 ? 700 : 400 }}>
                    {w.dwellDays}天
                  </td>
                  <td>{w.primaryResearcher}</td>
                  <td className="cc-action-cell">{w.actionSuggestion}</td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: cmdColors.textSecondary }}>暂无符合条件的工单</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
