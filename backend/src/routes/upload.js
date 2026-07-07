import express from 'express';
import multer from 'multer';
import { defaultSourceId, getDataSource } from '../config/dataSources.js';
import { parseWorkorderExcel } from '../services/excelParser.js';
import { analyzeWorkorders, buildStats } from '../services/analyzer.js';
import { replaceWorkorders } from '../db/database.js';
import { inferStatusTimes } from '../services/feishuClient.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream'
    ];
    const ext = (file.originalname || '').toLowerCase();
    const isExcelExt = ext.endsWith('.xlsx') || ext.endsWith('.xls');
    if (allowedMimes.includes(file.mimetype) || isExcelExt) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型：${file.mimetype}。请上传 .xlsx 或 .xls 格式的 Excel 文件。`));
    }
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的 Excel 文件（.xlsx 或 .xls 格式）' });
    }

    const source = getDataSource(req.body?.sourceId || req.query.sourceId || defaultSourceId);
    console.log(`[upload] Received file: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB), source: ${source.id}`);

    const parsedWorkorders = parseWorkorderExcel(req.file.buffer).map((item) => {
      // 规范化日期格式：兼容 Excel 中的 "2026/06/29 11:13" 等非标准格式
      const normalizeDate = (val) => {
        if (!val) return null;
        if (typeof val === 'number') {
          const ms = val < 10_000_000_000 ? val * 1000 : val;
          const d = new Date(ms);
          return Number.isNaN(d.getTime()) ? null : d.toISOString();
        }
        // 尝试解析 "2026/06/29 11:13", "2026-06-29", "2026/6/29" 等格式
        const d = new Date(String(val).replace(/\//g, '-'));
        return Number.isNaN(d.getTime()) ? String(val) : d.toISOString();
      };

      const updatedAt = normalizeDate(item.updatedAt);

      // 根据状态推断缺失的时间戳（与飞书同步逻辑一致）
      const inferred = inferStatusTimes({
        status: item.status,
        updatedAt,
        submittedAt: normalizeDate(item.submittedAt),
        resolvedAt: normalizeDate(item.resolvedAt),
        acceptedAt: normalizeDate(item.acceptedAt),
        archivedAt: normalizeDate(item.archivedAt)
      });

      return {
        ...item,
        id: `${source.id}:excel:${item.id}`,
        sourceId: source.id,
        sourceName: source.name,
        sourceRecordId: `excel:${item.id}`,
        updatedAt,
        submittedAt: inferred.submittedAt || updatedAt,
        resolvedAt: inferred.resolvedAt,
        acceptedAt: inferred.acceptedAt,
        archivedAt: inferred.archivedAt
      };
    });

    console.log(`[upload] Parsed ${parsedWorkorders.length} workorders from Excel`);

    const workorders = analyzeWorkorders(parsedWorkorders);
    const stats = buildStats(workorders);
    console.log(`[upload] Analysis complete: ${stats.validAnalysisCount} valid, ${stats.invalidAnalysisCount} invalid`);

    await replaceWorkorders(workorders, source);
    console.log(`[upload] Saved ${workorders.length} workorders to database`);

    return res.json({
      message: `上传成功，共解析 ${workorders.length} 条记录`,
      source: { id: source.id, name: source.name, provider: source.provider },
      count: workorders.length,
      workorders,
      stats
    });
  } catch (error) {
    console.error('[upload] Error:', error.message);
    return res.status(400).json({
      message: error.message || 'Excel 解析失败，请确认文件格式和内容正确。'
    });
  }
});

export default router;
