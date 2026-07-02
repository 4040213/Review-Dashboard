import express from 'express';
import multer from 'multer';
import { loadIssueRules, saveIssueRules, resetIssueRules, getActiveIssueRules } from '../rules/issueRules.js';
import { getAllWorkorders, replaceWorkorders } from '../db/database.js';
import { analyzeWorkorders, buildStats } from '../services/analyzer.js';
import { getDataSource } from '../config/dataSources.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/classification-rules — get current rules
router.get('/', (_req, res) => {
  res.json(loadIssueRules());
});

// PUT /api/classification-rules — batch update rules
router.put('/', (req, res) => {
  try {
    const document = req.body;
    if (!document || !Array.isArray(document.rules)) {
      return res.status(400).json({ message: '请求体格式错误，需要 { rules: [...] }' });
    }
    const saved = saveIssueRules(document);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message || '保存规则失败' });
  }
});

// POST /api/classification-rules/reanalyze — re-run analysis with current rules
router.post('/reanalyze', async (req, res) => {
  try {
    const sourceId = req.query.sourceId || req.body?.sourceId;
    const source = getDataSource(sourceId);
    const workorders = await getAllWorkorders(source.id);

    // Re-analyze with current user rules
    const rules = getActiveIssueRules();
    const analyzed = analyzeWorkorders(workorders, rules);
    await replaceWorkorders(analyzed, source);

    const stats = buildStats(analyzed);
    res.json({ message: '重新分析完成', count: analyzed.length, workorders: analyzed, stats });
  } catch (err) {
    res.status(500).json({ message: err.message || '重新分析失败' });
  }
});

// POST /api/classification-rules/reset — restore default rules
router.post('/reset', (_req, res) => {
  try {
    const document = resetIssueRules();
    res.json(document);
  } catch (err) {
    res.status(500).json({ message: err.message || '恢复默认规则失败' });
  }
});

// GET /api/classification-rules/export — export rules as JSON download
router.get('/export', (_req, res) => {
  try {
    const document = loadIssueRules();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="classification-rules-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(document);
  } catch (err) {
    res.status(500).json({ message: err.message || '导出失败' });
  }
});

// POST /api/classification-rules/import — import rules from JSON upload
router.post('/import', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传 JSON 文件' });
    }
    const raw = req.file.buffer.toString('utf-8');
    const document = JSON.parse(raw);
    if (!document || !Array.isArray(document.rules)) {
      return res.status(400).json({ message: 'JSON 格式错误，需要包含 rules 数组' });
    }
    const saved = saveIssueRules(document);
    res.json(saved);
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(400).json({ message: 'JSON 解析失败，请确认文件格式正确' });
    }
    res.status(500).json({ message: err.message || '导入失败' });
  }
});

export default router;
