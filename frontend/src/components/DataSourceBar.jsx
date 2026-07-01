export default function DataSourceBar({ sources, sourceId, autoSyncEnabled, lastSyncedAt, syncing, syncMessage, feishuStatus, onSourceChange, onAutoSyncChange, onManualSync }) {
  const currentSource = sources.find((source) => source.id === sourceId);
  const showSyncMessage = syncMessage && (syncing || syncMessage.includes('失败') || syncMessage.includes('成功'));

  return (
    <section className="panel data-source-bar">
      <div>
        <p className="eyebrow">Data Source</p>
        <h2>数据源配置</h2>
        <p className="muted">当前采用"切换数据源"方案，后续新增工单表只需添加数据源配置。</p>
      </div>
      <div className="data-source-actions">
        <label className="filter-field data-source-select">
          <span>当前数据源</span>
          <select value={sourceId} onChange={(event) => onSourceChange(event.target.value)}>
            {sources.map((source) => <option value={source.id} key={source.id}>{source.name}</option>)}
          </select>
        </label>
        <label className="auto-sync-toggle">
          <input type="checkbox" checked={autoSyncEnabled} onChange={(event) => onAutoSyncChange(event.target.checked)} />
          <span>自动同步，每 5 分钟</span>
        </label>
        <button className="secondary-button" type="button" disabled={syncing || (feishuStatus && !feishuStatus.configured)} onClick={onManualSync} title={feishuStatus && !feishuStatus.configured ? feishuStatus.hint : '从飞书同步最新数据'}>
          {syncing ? '同步中...' : '立即同步'}
        </button>
        <div className="sync-meta">
          <strong>{currentSource?.name || '-'}</strong>
          <span>最近同步：{lastSyncedAt ? new Date(lastSyncedAt).toLocaleString('zh-CN') : '暂无'}</span>
          {feishuStatus && (
            <span className={`feishu-status-tag ${feishuStatus.configured ? 'feishu-ok' : 'feishu-warn'}`}>
              {feishuStatus.configured ? '飞书已配置' : '飞书未配置'}
            </span>
          )}
        </div>
      </div>
      {showSyncMessage && (
        <div className={`sync-message-banner ${syncMessage.includes('失败') ? 'sync-error' : 'sync-success'}`}>
          {syncMessage}
        </div>
      )}
    </section>
  );
}
