import express from 'express';

const router = express.Router();

router.post('/sync', (_req, res) => {
  res.json({ message: '飞书同步功能待接入' });
});

export default router;
