import express from 'express';
import cors from 'cors';
import uploadRouter from './routes/upload.js';
import workordersRouter from './routes/workorders.js';
import statsRouter from './routes/stats.js';
import feishuRouter from './routes/feishu.js';
import { initDatabase } from './db/database.js';

const app = express();
const PORT = process.env.PORT || 3001;

await initDatabase();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/upload', uploadRouter);
app.use('/api/workorders', workordersRouter);
app.use('/api/stats', statsRouter);
app.use('/api/feishu', feishuRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err.message || '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`Workorder dashboard backend is running on http://localhost:${PORT}`);
});
