import express from 'express';
import { getAllWorkorders } from '../db/database.js';
import { buildStats } from '../services/analyzer.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  res.json({ workorders: await getAllWorkorders() });
});

router.get('/stats', async (_req, res) => {
  const workorders = await getAllWorkorders();
  res.json(buildStats(workorders));
});

export default router;
