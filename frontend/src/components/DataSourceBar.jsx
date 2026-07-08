import { useState } from 'react';
import { Icon } from '@iconify/react';

/**
 * 数据源配置面板 — 统一同步按钮（工单 + 评论一次完成）
 *
 * 支持：
 * - 切换数据源（从已注册列表中）
 * - 一键同步（调用 syncAll 统一端点）
 * - 粘贴自定义飞书多维表格链接同步
 * - 自动同步开关
 */
export default function DataSourceBar({
  sources, sourceId, autoSyncEnabled,
  lastSyncedAt, syncing, syncMessage,
  feishuStatus, onSourceChange, onAutoSyncChange, onManualSync,
}) {
  const currentSource = sources.find((source) => source.id === sourceId);
  const showSyncMessage = syncMessage && (syncing || syncMessage.includes('失败') || syncMessage.includes('成功') || syncMessage.includes('完成') || syncMessage.includes('⚠️') || syncMessage.includes('✅') || syncMessage.includes('❌'));
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  function handleSync() {
    const url = customUrl.trim();
    onManualSync(url || null);
  }

  return (
    <section className="panel data-source-bar">
      <div>
        <p className="eyebrow">Data Source</p>
        <h2>数据源配置</h2>
        <p className="muted">默认同步 .env 中配置的表格，也可粘贴其他飞书多维表格链接一键同步（工单+评论）。</p>
      </div>
      <div className="data-source-actions">
        <label className="filter-field data-source-select">
          <span>当前数据源</span>
          <select value={sourceId} onChange={(event) => onSourceChange(event.target.value)}>
            {sources.map((source) => (
              <option value={source.id} key={source.id}>
                {source.name} {source.isActive ? '(活跃)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="auto-sync-toggle">
          <input type="checkbox" checked={autoSyncEnabled} onChange={(event) => onAutoSyncChange(event.target.checked)} />
          <span>自动同步，每 5 分钟</span>
        </label>
        <div className="sync-buttons-group">
          <button
            className="sync-btn primary-sync"
            type="button"
            disabled={syncing || (feishuStatus && !feishuStatus.configured)}
            onClick={handleSync}
            title={feishuStatus && !feishuStatus.configured ? feishuStatus.hint : '同步工单与评论数据'}
          >
            <Icon icon="mdi:sync" width={15} height={15} />
            {' '}{syncing ? '同步中...' : '一键同步'}
          </button>
        </div>
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

      {/* ── 自定义表格链接输入 ── */}
      <div className="custom-table-row">
        <button
          className="custom-table-toggle"
          onClick={() => setShowCustomInput(!showCustomInput)}
        >
          <Icon icon={showCustomInput ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={14} height={14} />
          {showCustomInput ? '收起' : '同步其他表格'}
        </button>
        {showCustomInput && (
          <div className="custom-table-input-wrap">
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <input
                type="text"
                className="custom-table-input"
                placeholder="粘贴飞书多维表格链接，如 https://xxx.feishu.cn/wiki/xxx?table=tblXXX"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                className="sync-btn primary-sync"
                type="button"
                disabled={!customUrl.trim() || syncing}
                onClick={handleSync}
                style={{ minHeight: 36, padding: '0 16px', fontSize: 'var(--fs-caption)' }}
              >
                {syncing ? '同步中...' : '同步此表'}
              </button>
            </div>
            {customUrl.trim() && (
              <span className="custom-table-hint">
                <Icon icon="mdi:information-outline" width={12} height={12} />
                链接将被自动保存为数据源，下次可直接切换
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── 同步消息 ── */}
      {showSyncMessage && (
        <div className={`sync-message-banner ${syncMessage.includes('失败') || syncMessage.includes('❌') ? 'sync-error' : syncMessage.includes('⚠️') ? 'sync-warning' : 'sync-success'}`}>
          {syncMessage}
        </div>
      )}
    </section>
  );
}
