import { useEffect, useState } from 'react';
import {
  getClassificationRules,
  updateClassificationRules,
  reanalyzeWorkorders,
  resetClassificationRules,
  exportClassificationRules,
  importClassificationRules
} from '../api/workorders.js';

export default function ClassificationPanel({ sourceId, stats, onClose, onReanalyzed }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    setLoading(true);
    try {
      const result = await getClassificationRules();
      setRules(result.rules || []);
    } catch (err) {
      setMessage('加载规则失败：' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  }

  function updateRule(index, field, value) {
    setRules((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function updateKeywords(index, keywordStr) {
    const keywords = keywordStr.split(/[,，]/).map((k) => k.trim()).filter(Boolean);
    updateRule(index, 'keywords', keywords);
  }

  function addRule() {
    setRules((prev) => [...prev, { category: '', keywords: [], description: '', isActive: true }]);
  }

  function removeRule(index) {
    setRules((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave(reanalyze = false) {
    setSaving(true);
    setMessage('');
    try {
      await updateClassificationRules({ rules });
      setMessage('规则已保存');
      if (reanalyze) {
        const result = await reanalyzeWorkorders(sourceId);
        onReanalyzed?.(result);
        setMessage('规则已保存并重新分析完成');
      }
    } catch (err) {
      setMessage('保存失败：' + (err.message || '未知错误'));
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!window.confirm('确认恢复为默认分类规则？当前自定义规则将丢失。')) return;
    setSaving(true);
    try {
      const result = await resetClassificationRules();
      setRules(result.rules || []);
      setMessage('已恢复默认规则');
    } catch (err) {
      setMessage('恢复失败：' + (err.message || '未知错误'));
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    try {
      await exportClassificationRules();
      setMessage('规则已导出');
    } catch (err) {
      setMessage('导出失败');
    }
  }

  async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const result = await importClassificationRules(file);
        setRules(result.rules || []);
        setMessage('规则已导入');
      } catch (err) {
        setMessage('导入失败：' + (err.message || '未知错误'));
      }
    };
    input.click();
  }

  const previewDistribution = {};
  const otherCount = stats.issueCategoryRanking?.find((r) => r.name === '其他')?.count || 0;

  return (
    <div className="slide-panel-overlay" onClick={onClose}>
      <div className="slide-panel" onClick={(e) => e.stopPropagation()} style={{ width: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>⚙ 分类规则管理</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>自定义问题分类规则，修改后需重新分析</p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
        </div>

        {message && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 14,
            fontSize: 13,
            background: message.includes('失败') ? '#fee4e2' : '#dcfae6',
            color: message.includes('失败') ? '#b42318' : '#027a48'
          }}>
            {message}
          </div>
        )}

        {loading ? (
          <div className="empty-state" style={{ padding: 40 }}>加载中...</div>
        ) : (
          <>
            <div style={{ marginBottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="secondary-button" type="button" onClick={addRule} style={{ fontSize: 13, padding: '6px 14px' }}>+ 新增分类</button>
              <button className="secondary-button" type="button" onClick={handleExport} style={{ fontSize: 13, padding: '6px 14px' }}>导出规则</button>
              <button className="secondary-button" type="button" onClick={handleImport} style={{ fontSize: 13, padding: '6px 14px' }}>导入规则</button>
              <button className="secondary-button" type="button" onClick={handleReset} style={{ fontSize: 13, padding: '6px 14px', color: '#b42318' }}>恢复默认</button>
            </div>

            <div style={{ maxHeight: 340, overflowY: 'auto', marginBottom: 14 }}>
              {rules.map((rule, index) => (
                <div key={index} className="rule-row" style={{
                  display: 'flex',
                  gap: 8,
                  padding: '10px 0',
                  borderBottom: '1px solid #f1f5f9',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={rule.category}
                      onChange={(e) => updateRule(index, 'category', e.target.value)}
                      placeholder="分类名称"
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, marginBottom: 4 }}
                    />
                    <input
                      type="text"
                      value={(rule.keywords || []).join(', ')}
                      onChange={(e) => updateKeywords(index, e.target.value)}
                      placeholder="关键词（逗号分隔）"
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, color: '#64748b' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRule(index)}
                    style={{ border: 'none', background: 'transparent', color: '#d92d20', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}
                    title="删除"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {rules.length === 0 && (
                <div className="empty-state" style={{ padding: 20, fontSize: 13 }}>暂无分类规则，点击"新增分类"开始</div>
              )}
            </div>

            {/* Preview */}
            <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8, marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: '0 0 6px' }}>当前批次分类预览</p>
              <div style={{ fontSize: 13, color: '#475467' }}>
                {(stats.issueCategoryRanking || []).slice(0, 6).map((cat) => (
                  <span key={cat.name} style={{ marginRight: 12 }}>
                    {cat.name}: {cat.count}条 ({cat.percent}%)
                  </span>
                ))}
              </div>
              {otherCount > 0 && stats.validAnalysisCount > 0 && (otherCount / stats.validAnalysisCount * 100) >= 20 && (
                <p style={{ fontSize: 12, color: '#b54708', marginTop: 6 }}>
                  ⚠ "其他"分类占比 {(otherCount / stats.validAnalysisCount * 100).toFixed(1)}%，建议优化规则
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="upload-button"
                type="button"
                disabled={saving}
                onClick={() => handleSave(false)}
                style={{ flex: 1 }}
              >
                {saving ? '保存中...' : '保存规则'}
              </button>
              <button
                className="upload-button"
                type="button"
                disabled={saving}
                onClick={() => handleSave(true)}
                style={{ flex: 1, background: '#027a48' }}
              >
                {saving ? '处理中...' : '保存并重新分析'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
