import { useMemo, useState } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

const columns = [
  {
    accessorKey: 'riskLevel',
    header: '风险等级',
    cell: ({ getValue }) => <span className={`risk-tag risk-${getValue()}`}>{getValue() || '-'}</span>
  },
  { accessorKey: 'coursePosition', header: '课程定位' },
  { accessorKey: 'grade', header: '年级' },
  { accessorKey: 'week', header: '周' },
  { accessorKey: 'type', header: '所属类型' },
  { accessorKey: 'issueCategory', header: '问题一级分类' },
  {
    accessorKey: 'issueKeywords',
    header: '问题关键词',
    cell: ({ getValue }) => getValue()?.join('、') || '-'
  },
  {
    accessorKey: 'isUnclearRequirement',
    header: '是否需求不明确',
    cell: ({ getValue }) => (getValue() ? <span className="tag warning">是</span> : <span className="tag muted-tag">否</span>)
  },
  {
    accessorKey: 'unclearReasons',
    header: '不明确原因',
    cell: ({ getValue }) => getValue()?.join('、') || '-'
  },
  { accessorKey: 'status', header: '状态' },
  { accessorKey: 'owner', header: '负责人' },
  { accessorKey: 'updatedAt', header: '最后更新时间' },
  {
    accessorKey: 'description',
    header: '问题描述',
    cell: ({ getValue }) => <span className="description-cell">{getValue() || '-'}</span>
  }
];

const defaultFilters = {
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
  return [...new Set(workorders.map((item) => item[field]).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), 'zh-CN')
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">全部</option>
        {options.map((option) => {
          const value = typeof option === 'string' ? option : option.value;
          const text = typeof option === 'string' ? option : option.label;
          return (
            <option value={value} key={value}>
              {text}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export default function WorkorderTable({ workorders }) {
  const [filters, setFilters] = useState(defaultFilters);

  const filterOptions = useMemo(
    () => ({
      grade: uniqueOptions(workorders, 'grade'),
      week: uniqueOptions(workorders, 'week'),
      type: uniqueOptions(workorders, 'type'),
      issueCategory: uniqueOptions(workorders, 'issueCategory'),
      riskLevel: uniqueOptions(workorders, 'riskLevel'),
      status: uniqueOptions(workorders, 'status'),
      owner: uniqueOptions(workorders, 'owner')
    }),
    [workorders]
  );

  const filteredWorkorders = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();

    return workorders.filter((item) => {
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

  const table = useReactTable({
    data: filteredWorkorders,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function getRowClassName(item) {
    if (item.riskLevel === '高') return 'high-risk-row';
    if (item.isUnclearRequirement) return 'unclear-row';
    return '';
  }

  return (
    <section className="panel table-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Detail Data</p>
          <h2>工单明细</h2>
          <p className="muted">当前显示：{filteredWorkorders.length} / {workorders.length} 条</p>
        </div>
        <span className="count-badge">
          {filteredWorkorders.length} / {workorders.length} 条
        </span>
      </div>

      <div className="filters-grid">
        <FilterSelect label="年级" value={filters.grade} options={filterOptions.grade} onChange={(value) => updateFilter('grade', value)} />
        <FilterSelect label="周" value={filters.week} options={filterOptions.week} onChange={(value) => updateFilter('week', value)} />
        <FilterSelect label="所属类型" value={filters.type} options={filterOptions.type} onChange={(value) => updateFilter('type', value)} />
        <FilterSelect
          label="问题一级分类"
          value={filters.issueCategory}
          options={filterOptions.issueCategory}
          onChange={(value) => updateFilter('issueCategory', value)}
        />
        <FilterSelect
          label="需求不明确"
          value={filters.isUnclearRequirement}
          options={[
            { value: 'true', label: '是' },
            { value: 'false', label: '否' }
          ]}
          onChange={(value) => updateFilter('isUnclearRequirement', value)}
        />
        <FilterSelect label="风险等级" value={filters.riskLevel} options={filterOptions.riskLevel} onChange={(value) => updateFilter('riskLevel', value)} />
        <FilterSelect label="状态" value={filters.status} options={filterOptions.status} onChange={(value) => updateFilter('status', value)} />
        <FilterSelect label="负责人" value={filters.owner} options={filterOptions.owner} onChange={(value) => updateFilter('owner', value)} />
        <label className="filter-field search-field">
          <span>问题描述关键词</span>
          <input
            value={filters.keyword}
            placeholder="搜索问题描述"
            onChange={(event) => updateFilter('keyword', event.target.value)}
          />
        </label>
        <button className="secondary-button reset-button" type="button" onClick={() => setFilters(defaultFilters)}>
          重置筛选
        </button>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr className={getRowClassName(row.original)} key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} title={String(cell.getValue() ?? '')}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredWorkorders.length === 0 && <div className="empty-state">暂无匹配工单数据。</div>}
      </div>
    </section>
  );
}
