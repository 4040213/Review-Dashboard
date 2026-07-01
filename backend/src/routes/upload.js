import express from 'express';
import multer from 'multer';
import { defaultSourceId, getDataSource } from '../config/dataSources.js';
import { parseWorkorderExcel } from '../services/excelParser.js';
import { analyzeWorkorders, buildStats } from '../services/analyzer.js';
import { replaceWorkorders } from '../db/database.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传 Excel 文件' });
    }

    const source = getDataSource(req.body?.sourceId || req.query.sourceId || defaultSourceId);
    const parsedWorkorders = parseWorkorderExcel(req.file.buffer).map((item) => ({
      ...item,
      id: `${source.id}:excel:${item.id}`,
      sourceId: source.id,
      sourceName: source.name,
      sourceRecordId: `excel:${item.id}`
    }));
    const workorders = analyzeWorkorders(parsedWorkorders);
    await replaceWorkorders(workorders, source);

    return res.json({
      message: '上传、解析并分析成功',
      source: { id: source.id, name: source.name, provider: source.provider },
      count: workorders.length,
      workorders,
      stats: buildStats(workorders)
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message || 'Excel 解析失败'
    });
  }
});

export default router;
