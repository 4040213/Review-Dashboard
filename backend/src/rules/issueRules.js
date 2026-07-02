import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userRulesPath = path.resolve(__dirname, 'userIssueRules.json');
const defaultRulesPath = path.resolve(__dirname, 'defaultIssueRules.json');

// Static array export (backward compatible with V1.0)
export const issueRules = [
  {
    category: '负反馈/弹窗/解析',
    keywords: ['负反馈', '弹窗', '解析', '错三次', '错误音效']
  },
  {
    category: '题干/题目/文案',
    keywords: ['题干', '题目', '试题', '选项', '文字', '标点', '问号', '句号']
  },
  {
    category: '图片/UI显示',
    keywords: ['图片', '截图', '配图', '显示', '图标', '小手', '按钮', '对齐', '位置']
  },
  {
    category: '流程/交互/阻断',
    keywords: ['点击', '引导', '关闭', '跳转', '进入', '阻断', '流程']
  },
  {
    category: '音视频/语音',
    keywords: ['讲解视频', '视频', '音频', '音效', '语音', '旁白']
  },
  {
    category: '文件/配置/Key',
    keywords: ['key', 'Key', 'KEY', 'Figma', 'figma', '打包', '课包', '新建', '替换', '配置']
  },
  {
    category: '剧情/剧本/场景',
    keywords: ['剧情', '剧本', '场景', '镜头', '台词']
  }
];

/**
 * Load user-customized classification rules.
 * Returns the full rules document { version, rules: [...] }.
 * Falls back to default rules if user rules file doesn't exist.
 */
export function loadIssueRules() {
  try {
    if (fs.existsSync(userRulesPath)) {
      const raw = fs.readFileSync(userRulesPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.rules)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load user issue rules, falling back to defaults:', err.message);
  }

  try {
    const raw = fs.readFileSync(defaultRulesPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load default issue rules:', err.message);
    return { version: 1, rules: [] };
  }
}

/**
 * Get only active rules as a flat array of { category, keywords }
 * This is the format expected by the analyzer.
 */
export function getActiveIssueRules() {
  const document = loadIssueRules();
  return (document.rules || [])
    .filter((rule) => rule.isActive !== false)
    .map(({ category, keywords }) => ({ category, keywords }));
}

/**
 * Save user-customized rules to the user rules file.
 */
export function saveIssueRules(rulesDocument) {
  const doc = {
    version: rulesDocument.version || 1,
    rules: rulesDocument.rules || []
  };
  fs.writeFileSync(userRulesPath, JSON.stringify(doc, null, 2), 'utf-8');
  return doc;
}

/**
 * Reset user rules to factory defaults by copying the default file.
 */
export function resetIssueRules() {
  const defaultRaw = fs.readFileSync(defaultRulesPath, 'utf-8');
  fs.writeFileSync(userRulesPath, defaultRaw, 'utf-8');
  return JSON.parse(defaultRaw);
}
