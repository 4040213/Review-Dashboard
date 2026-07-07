import { useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { syncFeishu, uploadExcel } from '../api/workorders.js';

export default function UploadExcel({ sourceId, onUploaded }) {
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState(''); // 'success' | 'error' | ''
  const [uploading, setUploading] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatusType('');
    setLastResult(null);
    setStatus(`正在上传并解析：${file.name}（${(file.size / 1024).toFixed(1)} KB）...`);

    try {
      const result = await uploadExcel(file, sourceId);
      const stats = result.stats || {};
      const total = stats.totalRawCount ?? result.count ?? 0;
      const valid = stats.validAnalysisCount ?? 0;
      const invalid = stats.invalidAnalysisCount ?? 0;

      let msg = `上传成功！共解析 ${total} 条记录`;
      if (valid > 0) msg += `，其中 ${valid} 条进入分析`;
      if (invalid > 0) msg += `，${invalid} 条标记为无效`;
      msg += '。';

      // Show details about valid/invalid breakdown
      if (valid === 0 && total > 0) {
        msg += ` 注意：所有 ${total} 条均被标记为无效，请检查数据完整性。`;
      }

      setStatus(msg);
      setStatusType('success');
      setLastResult({ total, valid, invalid });
      onUploaded?.(result);
    } catch (error) {
      setStatus(`❌ 上传失败：${error.message || '未知错误'}`);
      setStatusType('error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleFeishuSync() {
    setUploading(true);
    setStatusType('');
    setLastResult(null);
    setStatus('正在从飞书多维表格同步工单数据...');

    try {
      const result = await syncFeishu(sourceId);
      const stats = result.stats || {};
      const total = stats.totalRawCount ?? result.count ?? 0;
      const valid = stats.validAnalysisCount ?? 0;

      setStatus(`同步完成 · ${result.message || '同步成功'}（共 ${total} 条，${valid} 条有效）`);
      setStatusType('success');
      setLastResult({ total, valid, invalid: 0 });
      onUploaded?.(result);
    } catch (error) {
      setStatus(`❌ 飞书同步失败：${error.message || '请求失败'}`);
      setStatusType('error');
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="panel upload-panel">
      <div>
        <p className="eyebrow">数据来源</p>
        <h2>上传 Excel 工单表</h2>
        <p className="muted">
          支持 .xlsx / .xls 格式，需包含「工单任务」工作表。当前数据源：{sourceId || '未配置'}
        </p>
      </div>

      <div className="upload-actions">
        <label className={`upload-button ${uploading ? 'disabled' : ''}`}>
          {uploading ? '解析中...' : <><Icon icon="mdi:file-excel-outline" width={16} height={16} style={{marginRight:4,verticalAlign:'middle'}} /> 选择 Excel 文件</>}
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" disabled={uploading} onChange={handleFileChange} />
        </label>
        <button className="secondary-button" type="button" disabled={uploading} onClick={handleFeishuSync}>
          <Icon icon="mdi:sync" width={16} height={16} style={{marginRight:4,verticalAlign:'middle'}} /> 从飞书同步
        </button>
      </div>

      {status && (
        <div
          className="upload-status"
          style={{
            color: statusType === 'error' ? 'var(--red-dark)' : statusType === 'success' ? 'var(--green)' : 'var(--text-secondary)',
            fontWeight: statusType ? 600 : 400
          }}
        >
          {status}
        </div>
      )}

      {lastResult && lastResult.total === 0 && (
        <div style={{ gridColumn: '1 / -1', padding: '10px 14px', background: 'rgba(254,240,199,0.6)', borderRadius: 12, fontSize: 'var(--fs-body-sm)', color: 'var(--gold)', fontWeight: 600 }}>
          未解析到任何数据行。请确认：
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            <li>Excel 中包含名为「工单任务」的工作表</li>
            <li>工作表第一行为表头，且包含问题描述、状态等必要列</li>
            <li>数据从第二行开始</li>
          </ul>
        </div>
      )}
    </section>
  );
}
