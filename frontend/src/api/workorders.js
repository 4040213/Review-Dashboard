const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

async function request(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || '请求失败');
  }

  return data;
}

export function getHealth() {
  return request('/health');
}

export function uploadExcel(file) {
  const formData = new FormData();
  formData.append('file', file);

  return request('/upload', {
    method: 'POST',
    body: formData
  });
}

export function getWorkorders() {
  return request('/workorders');
}

export function getStats() {
  return request('/workorders/stats');
}

export function syncFeishu() {
  return request('/feishu/sync', {
    method: 'POST'
  });
}
