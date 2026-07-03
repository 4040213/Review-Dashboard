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

// Classification rules
export function getClassificationRules() {
  return request('/classification-rules');
}

export function updateClassificationRules(rules) {
  return request('/classification-rules', {
    method: 'PUT',
    body: JSON.stringify(rules),
    headers: { 'Content-Type': 'application/json' }
  });
}

export function reanalyzeWorkorders(sourceId) {
  return request(withSource('/classification-rules/reanalyze', sourceId), { method: 'POST' });
}

export function resetClassificationRules() {
  return request('/classification-rules/reset', { method: 'POST' });
}

export function exportClassificationRules() {
  return request('/classification-rules/export');
}

export function importClassificationRules(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/classification-rules/import', { method: 'POST', body: formData });
}

// Pending review, rework, invalid
export function getPendingReview(sourceId) {
  return request(withSource('/workorders/pending-review', sourceId));
}

export function getReworkWorkorders(sourceId) {
  return request(withSource('/workorders/rework', sourceId));
}

export function getInvalidWorkorders(sourceId) {
  return request(withSource('/workorders/invalid', sourceId));
}

export function toggleUrgent(id, isUrgent) {
  return request(`/workorders/${encodeURIComponent(id)}/urgent`, {
    method: 'PATCH',
    body: JSON.stringify({ isUrgent }),
    headers: { 'Content-Type': 'application/json' }
  });
}

export function getPassRate(sourceId) {
  return request(withSource('/workorders/pass-rate', sourceId));
}

// ── 生产指挥舱 API ──

export function getCommandOverview(sourceId) {
  return request(withSource('/command-center/overview', sourceId));
}

export function getCommandDiagnostics(sourceId) {
  return request(withSource('/command-center/diagnostics', sourceId));
}

export function getCommandTasklist(sourceId, filters = {}) {
  const params = new URLSearchParams();
  if (filters.grade) params.set('grade', filters.grade);
  if (filters.week) params.set('week', filters.week);
  if (filters.status) params.set('status', filters.status);
  if (filters.researcher) params.set('researcher', filters.researcher);
  if (filters.onlyUnclosed) params.set('onlyUnclosed', 'true');
  const qs = params.toString();
  return request(withSource(`/command-center/tasklist${qs ? '?' + qs : ''}`, sourceId));
}

export function getCommandForecast(sourceId) {
  return request(withSource('/command-center/forecast', sourceId));
}

export function getCommandBhi(sourceId) {
  return request(withSource('/command-center/bhi', sourceId));
}

export function getCommandAll(sourceId) {
  return request(withSource('/command-center/all', sourceId));
}
