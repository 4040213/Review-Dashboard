import { useEffect, useMemo, useState } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

function joinValues(values) {
  return values?.length ? values.join('、') : '-';
}

// Column width presets (in px)
const W = {
  narrow: 80,    // tags, short labels
  medium: 110,   // status, grade, week
  wide: 150,     // owner, dates, keywords
  extra: 200,    // reasons, longer text
  desc: 300      // description
};

const baseColumns = [
  {
    accessorKey: 'isValidForAnalysis',
    header: '是否有效分析',
    size: W.narrow,
    cell: ({ getValue }) => (getValue() ? <span className="tag ok-tag">有效</span> : <span className="tag muted-tag">无效</span>)
  },
  { accessorKey: 'riskLevel', header: '风险等级', size: W.narrow, cell: ({ getValue }) => <span className={`risk-tag risk-${getValue()}`}>{getValue() || '-'}</span> },
  { accessorKey: 'status', header: '状态', size: W.medium },
  { accessorKey: 'statusGroup', header: '状态分组', size: W.medium },
  { accessorKey: 'coursePosition', header: '课程定位', size: W.medium },
  { accessorKey: 'grade', header: '年级', size: 70 },
  { accessorKey: 'week', header: '周', size: 70 },
  { accessorKey: 'type', header: '所属类型', size: W.medium },
  {
    accessorKey: 'issueCategory',
    header: '问题一级分类',
    size: W.wide,
    cell: ({ row }) => (
      <span className="classification-reason">
        {row.original.issueCategory || '其他'}
        {(row.original.issueKeywords?.length > 0) && (
          <>
            <span className="info-icon">?</span>
            <span className="reason-popover">
              匹配关键词：{joinValues(row.original.issueKeywords)}<br />
              分类规则：{row.original.issueCategory}
            </span>
          </>
        )}
      </span>
    )
  },
  { accessorKey: 'issueKeywords', header: '问题关键词', size: W.wide, cell: ({ getValue }) => joinValues(getValue()) },
  { accessorKey: 'isUnclearRequirement', header: '是否需求不明确', size: W.narrow, cell: ({ getValue }) => (getValue() ? <span className="tag warning">是</span> : <span className="tag muted-tag">否</span>) },
  { accessorKey: 'unclearReasons', header: '不明确原因', size: W.extra, cell: ({ getValue }) => joinValues(getValue()) },
  { accessorKey: 'isRepeatedAdjustmentCandidate', header: '是否反复调整候选', size: 100, cell: ({ getValue }) => (getValue() ? <span className="tag danger">是</span> : <span className="tag muted-tag">否</span>) },
  { accessorKey: 'owner', header: '负责人', size: W.medium },
  { accessorKey: 'updatedAt', header: '最后更新时间', size: W.wide },
  { accessorKey: 'submittedAt', header: '工单提出时间', size: W.wide },
  { accessorKey: 'resolvedAt', header: '工单解决时间', size: W.wide },
  { accessorKey: 'acceptedAt', header: '工单验收时间', size: W.wide },
  { accessorKey: 'archivedAt', header: '工单归档时间', size: W.wide },
  { accessorKey: 'invalidReasons', header: '无效原因', size: W.extra, cell: ({ getValue }) => joinValues(getValue()) },
  { accessorKey: 'description', header: '问题描述', size: W.desc, cell: ({ getValue }) => <span className="description-cell">{getValue() || '-'}</span> }
];

const invalidTypeColumn = {
  accessorKey: 'invalidType',
  header: '无效类型',
  size: 110,
  cell: ({ getValue }) => {
    const type = getValue();
    const labels = {
      collaboration_placeholder: '协作占位',
      test_data: '测试数据',
      blank: '空白/无效',
      incomplete: '信息不完整'
    };
    return labels[type] || '-';
  }
};

const defaultFilters = {
  isValidForAnalysis: '',
  invalidReason: '',
  statusGroup: '',
  grade: '',
  week: '',
  type: '',
  issueCategory: '',
  isUnclearRequirement: '',
  riskLevel: '',
  status: '',
  owner: '',
  keyword: ''
};

function uniqueOptions(workorders, field) {
  return [...new Set(workorders.map((item) => item[field]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN'));
}

function uniqueArrayOptions(workorders, field) {
  return [...new Set(workorders.flatMap((item) => item[field] || []).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN'));
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">全部</option>
        {options.map((option) => {
          const optionValue = typeof option === 'string' ? option : option.value;
          const text = typeof option === 'string' ? option : option.label;
          return <option value={optionValue} key={optionValue}>{text}</option>;
        })}
      </select>
    </label>
  );
}

export default function WorkorderTable({ workorders, activeFilter, showInvalidType }) {
  const [filters, setFilters] = useState(defaultFilters);

  // Sync activeFilter from left panel clicks to table filters
  useEffect(() => {
    if (!activeFilter) return;
    const next = { ...defaultFilters };
    switch (activeFilter.type) {
      case 'errorContent':
        next.issueCategory = activeFilter.value;
        break;
      case 'unclearReason':
        next.isUnclearRequirement = 'true';
        break;
      case 'statusGroup':
        next.statusGroup = activeFilter.value;
        break;
      case 'riskLevel':
        next.riskLevel = '高';
        break;
      case 'isUnclearRequirement':
        next.isUnclearRequirement = 'true';
        break;
      case 'isRepeatedAdjustment':
        next.keyword = '';
        break;
      case 'scope':
        if (activeFilter.value === 'valid') next.isValidForAnalysis = 'true';
        if (activeFilter.value === 'invalid') next.isValidForAnalysis = 'false';
        break;
      default:
        break;
    }
    setFilters(next);
  }, [activeFilter?.type, activeFilter?.value]);

  const filterOptions = useMemo(() => ({
    grade: uniqueOptions(workorders, 'grade'),
    week: uniqueOptions(workorders, 'week'),
    type: uniqueOptions(workorders, 'type'),
    issueCategory: uniqueOptions(workorders, 'issueCategory'),
    riskLevel: uniqueOptions(workorders, 'riskLevel'),
    status: uniqueOptions(workorders, 'status'),
    statusGroup: uniqueOptions(workorders, 'statusGroup'),
    owner: uniqueOptions(workorders, 'owner'),
    invalidReason: uniqueArrayOptions(workorders, 'invalidReasons')
  }), [workorders]);

  const filteredWorkorders = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    return workorders.filter((item) => {
      if (filters.isValidForAnalysis && String(item.isValidForAnalysis) !== filters.isValidForAnalysis) return false;
      if (filters.invalidReason && !(item.invalidReasons || []).includes(filters.invalidReason)) return false;
      if (filters.statusGroup && item.statusGroup !== filters.statusGroup) return false;
      if (filters.grade && item.grade !== filters.grade) return false;
      if (filters.week && item.week !== filters.week) return false;
      if (filters.type && item.type !== filters.type) return false;
      if (filters.issueCategory && item.issueCategory !== filters.issueCategory) return false;
      if (filters.isUnclearRequirement && String(item.isUnclearRequirement) !== filters.isUnclearRequirement) return false;
      if (filters.riskLevel && item.riskLevel !== filters.riskLevel) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.owner && item.owner !== filters.owner) return false;
      if (keyword && !String(item.description || '').toLowerCase().includes(keyword)) return false;
      return true;
    });
  }, [filters, workorders]);

  const highlightedIds = useMemo(() => {
    if (!activeFilter?.keywords?.length) return new Set();
    const lowerKeywords = activeFilter.keywords.map((k) => String(k).toLowerCase());
    return new Set(
      workorders
        .filter((w) => lowerKeywords.some((k) => String(w.description || '').toLowerCase().includes(k) || (w.issueKeywords || []).some((ik) => String(ik).toLowerCase().includes(k))))
        .map((w) => w.id)
    );
  }, [activeFilter?.keywords, workorders]);

  const columns = useMemo(() => {
    if (showInvalidType) {
      const cols = [...baseColumns];
      cols.splice(1, 0, invalidTypeColumn);
      return cols;
    }
    return baseColumns;
  }, [showInvalidType]);

  const table = useReactTable({ data: filteredWorkorders, columns, getCoreRowModel: getCoreRowModel() });

  // Columns whose cells need overflow:visible for popovers
  const passthroughColumns = new Set(['issueCategory']);

  // Columns that should allow multi-line wrapping (overrides nowrap)
  const wrapColumns = new Set(['description']);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function getRowClassName(item) {
    const classes = [];
    if (highlightedIds.has(item.id)) classes.push('highlighted-row');
    if (!item.isValidForAnalysis) classes.push('invalid-row');
    if (item.riskLevel === '高') classes.push('high-risk-row');
    if (item.isUnclearRequirement) classes.push('unclear-row');
    return classes.join(' ');
  }

  // Compute total table width
  const totalWidth = columns.reduce((sum, col) => sum + (col.size || W.medium), 0);

  return (
    <section className="panel table-panel" style={{ marginTop: 12 }}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Detail Data</p>
          <h2>工单明细</h2>
          <p className="muted">当前显示：{filteredWorkorders.length} / {workorders.length} 条</p>
        </div>
        <span className="count-badge">{filteredWorkorders.length} / {workorders.length} 条</span>
      </div>

      <div className="filters-grid" style={showInvalidType !== undefined ? { display: 'none' } : {}}>
        <FilterSelect label="是否有效分析" value={filters.isValidForAnalysis} options={[{ value: 'true', label: '有效工单' }, { value: 'false', label: '无效工单' }]} onChange={(value) => updateFilter('isValidForAnalysis', value)} />
        <FilterSelect label="无效原因" value={filters.invalidReason} options={filterOptions.invalidReason} onChange={(value) => updateFilter('invalidReason', value)} />
        <FilterSelect label="状态分组" value={filters.statusGroup} options={filterOptions.statusGroup} onChange={(value) => updateFilter('statusGroup', value)} />
        <FilterSelect label="年级" value={filters.grade} options={filterOptions.grade} onChange={(value) => updateFilter('grade', value)} />
        <FilterSelect label="周" value={filters.week} options={filterOptions.week} onChange={(value) => updateFilter('week', value)} />
        <FilterSelect label="所属类型" value={filters.type} options={filterOptions.type} onChange={(value) => updateFilter('type', value)} />
        <FilterSelect label="问题一级分类" value={filters.issueCategory} options={filterOptions.issueCategory} onChange={(value) => updateFilter('issueCategory', value)} />
        <FilterSelect label="需求不明确" value={filters.isUnclearRequirement} options={[{ value: 'true', label: '是' }, { value: 'false', label: '否' }]} onChange={(value) => updateFilter('isUnclearRequirement', value)} />
        <FilterSelect label="风险等级" value={filters.riskLevel} options={filterOptions.riskLevel} onChange={(value) => updateFilter('riskLevel', value)} />
        <FilterSelect label="状态" value={filters.status} options={filterOptions.status} onChange={(value) => updateFilter('status', value)} />
        <FilterSelect label="负责人" value={filters.owner} options={filterOptions.owner} onChange={(value) => updateFilter('owner', value)} />
        <label className="filter-field search-field"><span>问题描述关键词</span><input value={filters.keyword} placeholder="搜索问题描述" onChange={(event) => updateFilter('keyword', event.target.value)} /></label>
        <button className="secondary-button reset-button" type="button" onClick={() => setFilters(defaultFilters)}>重置筛选</button>
      </div>

      <div className="table-scroll">
        <table style={{ minWidth: totalWidth, tableLayout: 'fixed' }}>
          <thead>{table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const colSize = header.column.columnDef.size || W.medium;
                return (
                  <th key={header.id} style={{ width: colSize, minWidth: colSize }}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                );
              })}
            </tr>
          ))}</thead>
          <tbody>{table.getRowModel().rows.map((row) => (
            <tr className={getRowClassName(row.original)} key={row.id}>
              {row.getVisibleCells().map((cell) => {
                const colId = cell.column.id;
                const colSize = cell.column.columnDef.size || W.medium;
                const isPassthrough = passthroughColumns.has(colId);
                const isWrap = wrapColumns.has(colId);
                const rawValue = String(cell.getValue() ?? '');

                return (
                  <td
                    key={cell.id}
                    className={isPassthrough ? 'cell-passthrough' : ''}
                    style={{ width: colSize, minWidth: colSize }}
                    title={!isPassthrough && !isWrap ? rawValue : undefined}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}</tbody>
        </table>
        {filteredWorkorders.length === 0 && (
          <div className="empty-state">
            {workorders.length === 0
              ? '暂无工单数据。请先上传 Excel 文件（需包含「工单任务」工作表），或从飞书同步。'
              : '当前筛选条件下无匹配工单，请调整上方筛选条件或切换数据范围。'}
          </div>
        )}
      </div>
    </section>
  );
}
