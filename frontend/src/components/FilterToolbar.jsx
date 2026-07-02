const STATUS_OPTIONS = ['已归档', '待验收', '处理中', '暂停/挂起'];
const INVALID_TYPE_OPTIONS = [
  { key: 'collaboration_placeholder', label: '协作占位' },
  { key: 'test_data', label: '测试数据' },
  { key: 'blank', label: '空白/无效' },
  { key: 'incomplete', label: '信息不完整' }
];

const STATUS_COLORS = {
  '已归档': '#027a48',
  '待验收': '#2878ff',
  '处理中': '#b54708',
  '暂停/挂起': '#94a3b8'
};

export default function FilterToolbar({ filterState, onFilterChange, workorders, stats }) {
  function updateScope(scope) {
    onFilterChange({ ...filterState, scope });
  }

  function toggleStatus(status) {
    const next = filterState.excludedStatuses.includes(status)
      ? filterState.excludedStatuses.filter((s) => s !== status)
      : [...filterState.excludedStatuses, status];
    onFilterChange({ ...filterState, excludedStatuses: next });
  }

  function toggleInvalidType(type) {
    const next = filterState.excludedInvalidTypes.includes(type)
      ? filterState.excludedInvalidTypes.filter((t) => t !== type)
      : [...filterState.excludedInvalidTypes, type];
    onFilterChange({ ...filterState, excludedInvalidTypes: next });
  }

  function updateKeyword(keyword) {
    onFilterChange({ ...filterState, keyword });
  }

  const showInvalidFilters = filterState.scope !== 'valid';

  return (
    <div className="filter-toolbar">
      <div className="filter-scope-group">
        <button
          className={`filter-scope-btn ${filterState.scope === 'valid' ? 'active' : ''}`}
          onClick={() => updateScope('valid')}
        >
          仅有效工单
        </button>
        <button
          className={`filter-scope-btn ${filterState.scope === 'all' ? 'active' : ''}`}
          onClick={() => updateScope('all')}
        >
          全部工单
        </button>
        <button
          className={`filter-scope-btn ${filterState.scope === 'invalid' ? 'active' : ''}`}
          onClick={() => updateScope('invalid')}
        >
          仅无效工单
        </button>
      </div>

      <div className="filter-checkbox-group">
        <span style={{ fontSize: 12, color: '#94a3b8', marginRight: 2 }}>状态:</span>
        {STATUS_OPTIONS.map((status) => (
          <label key={status} className="filter-checkbox-label" style={{ color: STATUS_COLORS[status] }}>
            <input
              type="checkbox"
              checked={!filterState.excludedStatuses.includes(status)}
              onChange={() => toggleStatus(status)}
            />
            {status}
          </label>
        ))}
      </div>

      {showInvalidFilters && stats.invalidAnalysisCount > 0 && (
        <div className="filter-checkbox-group">
          <span style={{ fontSize: 12, color: '#94a3b8', marginRight: 2 }}>无效类型:</span>
          {INVALID_TYPE_OPTIONS.map((type) => (
            <label key={type.key} className="filter-checkbox-label">
              <input
                type="checkbox"
                checked={!filterState.excludedInvalidTypes.includes(type.key)}
                onChange={() => toggleInvalidType(type.key)}
              />
              {type.label}
            </label>
          ))}
        </div>
      )}

      <input
        type="text"
        className="filter-search-input"
        placeholder="搜索问题描述关键词..."
        value={filterState.keyword || ''}
        onChange={(e) => updateKeyword(e.target.value)}
      />
    </div>
  );
}
