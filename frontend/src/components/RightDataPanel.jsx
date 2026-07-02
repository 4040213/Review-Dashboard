import FilterToolbar from './FilterToolbar.jsx';
import WorkorderTable from './WorkorderTable.jsx';
import PendingReviewQueue from './PendingReviewQueue.jsx';
import ReworkList from './ReworkList.jsx';
import InvalidList from './InvalidList.jsx';

const TABS = [
  { key: 'all', label: '全量明细' },
  { key: 'pending', label: '待验收队列' },
  { key: 'rework', label: '反复修改' },
  { key: 'invalid', label: '不合格工单' }
];

export default function RightDataPanel({
  activeTab,
  onTabChange,
  workorders,
  stats,
  activeFilter,
  filterState,
  onFilterChange,
  pendingReviewData,
  reworkData,
  invalidData,
  onToggleUrgent
}) {
  function renderTabContent() {
    switch (activeTab) {
      case 'pending':
        return <PendingReviewQueue data={pendingReviewData} onToggleUrgent={onToggleUrgent} />;
      case 'rework':
        return <ReworkList data={reworkData} workorders={workorders} />;
      case 'invalid':
        return <InvalidList data={invalidData} workorders={workorders} />;
      case 'all':
      default:
        return (
          <>
            <FilterToolbar
              filterState={filterState}
              onFilterChange={onFilterChange}
              workorders={workorders}
              stats={stats}
            />
            <WorkorderTable
              workorders={workorders}
              activeFilter={activeFilter}
              showInvalidType={filterState.scope !== 'valid'}
            />
          </>
        );
    }
  }

  return (
    <div className="right-data-panel">
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
            {tab.key === 'pending' && pendingReviewData?.length > 0 && (
              <span style={{ marginLeft: 6, background: '#fee4e2', color: '#b42318', padding: '1px 6px', borderRadius: 8, fontSize: 11 }}>{pendingReviewData.length}</span>
            )}
            {tab.key === 'rework' && (reworkData?.length || stats?.repeatedAdjustmentCandidateCount) > 0 && (
              <span style={{ marginLeft: 6, background: '#fef0c7', color: '#b54708', padding: '1px 6px', borderRadius: 8, fontSize: 11 }}>{reworkData?.length || stats?.repeatedAdjustmentCandidateCount}</span>
            )}
            {tab.key === 'invalid' && (invalidData?.length || stats?.invalidAnalysisCount) > 0 && (
              <span style={{ marginLeft: 6, background: '#f1f5f9', color: '#64748b', padding: '1px 6px', borderRadius: 8, fontSize: 11 }}>{invalidData?.length || stats?.invalidAnalysisCount}</span>
            )}
          </button>
        ))}
      </div>
      {renderTabContent()}
    </div>
  );
}
