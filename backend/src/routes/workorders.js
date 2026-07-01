import express from 'express';
import { dataSources, defaultSourceId } from '../config/dataSources.js';
import { getAllWorkorders } from '../db/database.js';
import { buildStats } from '../services/analyzer.js';

const router = express.Router();

function getSourceId(req) {
  return req.query.sourceId || defaultSourceId;
}

router.get('/sources', (_req, res) => {
  res.json({ defaultSourceId, sources: dataSources.map(({ id, name, provider }) => ({ id, name, provider })) });
});

router.get('/', async (req, res) => {
  res.json({ workorders: await getAllWorkorders(getSourceId(req)) });
});

router.get('/stats', async (req, res) => {
  const workorders = await getAllWorkorders(getSourceId(req));
  res.json(buildStats(workorders));
});

export default router;
