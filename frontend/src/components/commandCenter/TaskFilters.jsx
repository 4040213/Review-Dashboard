/**
 * Tab 3: 待办工单清单 — 筛选器
 */
import { cmdColors } from '../charts/chartTheme.js';

export default function TaskFilters({ filters, filterOptions, onFilterChange }) {
  function toggleFilter(key, value) {
    onFilterChange?.({ ...filters, [key]: value });
  }

  return (
    <div className="cc-task-filters">
      {/* Only unclosed toggle */}
      <label className="cc-filter-toggle">
        <input
          type="checkbox"
          checked={filters?.onlyUnclosed || false}
          onChange={(e) => toggleFilter('onlyUnclosed', e.target.checked)}
        />
        <span>仅显示未关闭</span>
      </label>

      {/* Grade filter */}
      <select
        value={filters?.grade || ''}
        onChange={(e) => toggleFilter('grade', e.target.value || null)}
        className="cc-filter-select"
      >
        <option value="">全部年级</option>
        {(filterOptions?.grades || []).map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>

      {/* Week filter */}
      <select
        value={filters?.week || ''}
        onChange={(e) => toggleFilter('week', e.target.value || null)}
        className="cc-filter-select"
      >
        <option value="">全部讲次</option>
        {(filterOptions?.weeks || []).map((w) => (
          <option key={w} value={w}>{w}</option>
        ))}
      </select>

      {/* Status filter */}
      <select
        value={filters?.status || ''}
        onChange={(e) => toggleFilter('status', e.target.value || null)}
        className="cc-filter-select"
      >
        <option value="">全部状态</option>
        {(filterOptions?.statuses || []).map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Researcher filter */}
      <select
        value={filters?.researcher || ''}
        onChange={(e) => toggleFilter('researcher', e.target.value || null)}
        className="cc-filter-select"
      >
        <option value="">全部负责人</option>
        {(filterOptions?.researchers || []).map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      {/* Keyword search */}
      <input
        type="text"
        placeholder="搜索问题描述..."
        value={filters?.keyword || ''}
        onChange={(e) => toggleFilter('keyword', e.target.value || null)}
        className="cc-filter-search"
      />
    </div>
  );
}
