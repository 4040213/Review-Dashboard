import express from 'express';
import { getAllWorkorders } from '../db/database.js';
import { buildCommandCenterStats } from '../services/commandCenterEtl.js';

const router = express.Router();

/**
 * GET /api/command-center/overview
 * Tab 1 总览驾驶舱: KPIs, BHI, 状态分布, 年级密度, 14日吞吐趋势
 */
router.get('/overview', async (req, res) => {
  try {
    const workorders = await getAllWorkorders();
    const data = buildCommandCenterStats(workorders);
    res.json(data.overview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/command-center/diagnostics
 * Tab 2 深度诊断: 箱线图, 热力图, 堆积图, 负载, 散点图
 */
router.get('/diagnostics', async (req, res) => {
  try {
    const workorders = await getAllWorkorders();
    const data = buildCommandCenterStats(workorders);
    res.json(data.diagnostics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/command-center/tasklist
 * Tab 3 待办清单: 优先级排序工单 + 筛选项
 * 支持查询参数: ?grade=, &week=, &status=, &researcher=, &onlyUnclosed=true
 */
router.get('/tasklist', async (req, res) => {
  try {
    const workorders = await getAllWorkorders();
    const data = buildCommandCenterStats(workorders);
    let tasks = data.tasklist.workorders;

    // Apply filters
    const { grade, week, status, researcher, onlyUnclosed } = req.query;
    if (grade) {
      const gradeFilter = String(grade);
      tasks = tasks.filter((t) => t.gradeWeek?.startsWith(gradeFilter));
    }
    if (week) {
      const weekFilter = String(week);
      tasks = tasks.filter((t) => t.gradeWeek?.endsWith(weekFilter));
    }
    if (status) {
      const statusFilter = String(status);
      tasks = tasks.filter((t) => t.status === statusFilter);
    }
    if (researcher) {
      const researcherFilter = String(researcher);
      tasks = tasks.filter((t) => t.primaryResearcher === researcherFilter);
    }
    if (onlyUnclosed === 'true') {
      tasks = tasks.filter((t) => t.statusGroupV2 !== '已关闭');
    }

    res.json({ ...data.tasklist, workorders: tasks, filtered: tasks.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/command-center/forecast
 * Tab 4 预测与趋势: 完成预测, 气泡图, 流入流出
 */
router.get('/forecast', async (req, res) => {
  try {
    const workorders = await getAllWorkorders();
    const data = buildCommandCenterStats(workorders);
    res.json(data.forecast);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/command-center/bhi
 * 单独获取 BHI 指数
 */
router.get('/bhi', async (req, res) => {
  try {
    const workorders = await getAllWorkorders();
    const data = buildCommandCenterStats(workorders);
    res.json({ bhi: data.overview.bhi, bhiDetail: data.overview.bhiDetail });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/command-center/all
 * 返回所有4个Tab的完整数据
 */
router.get('/all', async (req, res) => {
  try {
    const workorders = await getAllWorkorders();
    const data = buildCommandCenterStats(workorders);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
