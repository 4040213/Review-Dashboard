/**
 * Tab 3: 待办工单清单 — Actionable Task List
 */
import { useState, useCallback } from 'react';
import TaskFilters from './TaskFilters.jsx';
import TaskTable from './TaskTable.jsx';

export default function TaskListTab({ data }) {
  const [filters, setFilters] = useState({
    onlyUnclosed: true,
    grade: null,
    week: null,
    status: null,
    researcher: null,
    keyword: null
  });

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  if (!data) {
    return <div className="panel loading">正在加载待办清单...</div>;
  }

  return (
    <div className="cc-tab-content">
      <TaskFilters
        filters={filters}
        filterOptions={data.filters}
        onFilterChange={handleFilterChange}
      />
      <TaskTable
        workorders={data.workorders || []}
        filters={filters}
        onFilterChange={handleFilterChange}
      />
    </div>
  );
}
