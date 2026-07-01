import { useRef, useState } from 'react';
import { syncFeishu, uploadExcel } from '../api/workorders.js';

export default function UploadExcel({ sourceId, onUploaded }) {
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState('请选择包含「工单任务」sheet 的 Excel 文件');
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatus(`正在上传并解析：${file.name}`);

    try {
      const result = await uploadExcel(file, sourceId);
      const stats = result.stats || {};
      setStatus(`上传成功，共解析 ${stats.totalRawCount ?? result.count ?? 0} 条记录，其中 ${stats.validAnalysisCount ?? 0} 条进入分析，${stats.invalidAnalysisCount ?? 0} 条被标记为无效工单。`);
      onUploaded?.(result);
    } catch (error) {
      setStatus(error.message || '上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleFeishuSync() {
    setUploading(true);
    setStatus('正在从飞书多维表格同步工单数据...');

    try {
      const result = await syncFeishu(sourceId);
      const stats = result.stats || {};
      setStatus(`${result.message}，其中 ${stats.validAnalysisCount ?? 0} 条进入分析，${stats.invalidAnalysisCount ?? 0} 条被标记为无效工单。`);
      onUploaded?.(result);
    } catch (error) {
      setStatus(error.message || '飞书同步请求失败');
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="panel upload-panel">
      <div>
        <p className="eyebrow">数据来源</p>
        <h2>上传 Excel 工单表</h2>
        <p className="muted">当前版本支持解析名为「工单任务」的 sheet，并将全部记录保存到本地 SQLite，核心分析只统计有效工单。</p>
      </div>

      <div className="upload-actions">
        <label className={`upload-button ${uploading ? 'disabled' : ''}`}>
          {uploading ? '解析中...' : '选择 Excel 文件'}
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" disabled={uploading} onChange={handleFileChange} />
        </label>
        <button className="secondary-button" type="button" onClick={handleFeishuSync}>从飞书同步</button>
      </div>

      <div className="upload-status">{status}</div>
    </section>
  );
}
