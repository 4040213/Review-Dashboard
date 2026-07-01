const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

function withSource(path, sourceId) {
  if (!sourceId) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}sourceId=${encodeURIComponent(sourceId)}`;
}

async function request(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(data.message || '请求失败');
  return data;
}

export function getHealth() {
  return request('/health');
}

export function getSources() {
  return request('/workorders/sources');
}

export function uploadExcel(file, sourceId) {
  const formData = new FormData();
  formData.append('file', file);
  if (sourceId) formData.append('sourceId', sourceId);

  return request(withSource('/upload', sourceId), { method: 'POST', body: formData });
}

export function getWorkorders(sourceId) {
  return request(withSource('/workorders', sourceId));
}

export function getStats(sourceId) {
  return request(withSource('/workorders/stats', sourceId));
}

export function syncFeishu(sourceId) {
  return request('/feishu/sync', {
    method: 'POST',
    body: JSON.stringify({ sourceId }),
    headers: { 'Content-Type': 'application/json' }
  });
}

export function getFeishuStatus() {
  return request('/feishu/status');
}
