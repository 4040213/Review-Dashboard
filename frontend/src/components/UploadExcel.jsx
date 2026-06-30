import { useRef, useState } from 'react';
import { syncFeishu, uploadExcel } from '../api/workorders.js';

export default function UploadExcel({ onUploaded }) {
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState('请选择包含「工单任务」sheet 的 Excel 文件');
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatus(`正在上传并解析：${file.name}`);

    try {
      const result = await uploadExcel(file);
      setStatus(`上传成功，共解析并分析 ${result.count} 条工单`);
      onUploaded?.(result);
    } catch (error) {
      setStatus(error.message || '上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleFeishuSync() {
    try {
      const result = await syncFeishu();
      setStatus(result.message);
    } catch (error) {
      setStatus(error.message || '飞书同步请求失败');
    }
  }

  return (
    <section className="panel upload-panel">
      <div>
        <p className="eyebrow">数据来源</p>
        <h2>上传 Excel 工单表</h2>
        <p className="muted">当前版本支持解析名为「工单任务」的 sheet，并将数据保存到本地 SQLite。</p>
      </div>

      <div className="upload-actions">
        <label className={`upload-button ${uploading ? 'disabled' : ''}`}>
          {uploading ? '解析中...' : '选择 Excel 文件'}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            disabled={uploading}
            onChange={handleFileChange}
          />
        </label>
        <button className="secondary-button" type="button" onClick={handleFeishuSync}>
          从飞书同步
        </button>
      </div>

      <div className="upload-status">{status}</div>
    </section>
  );
}
