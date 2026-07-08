import express from 'express';
import { getDataSource } from '../config/dataSources.js';
import { replaceWorkorders, saveDataSource, setActiveDataSource, deleteDataSource, getAllDataSources } from '../db/database.js';
import { analyzeWorkorders, buildStats } from '../services/analyzer.js';
import { fetchFeishuWorkorders } from '../services/feishuClient.js';
import { syncAll } from '../services/syncService.js';

const router = express.Router();

function checkFeishuConfig() {
  const requiredVars = [
    { key: 'FEISHU_APP_ID', label: '飞书应用 ID' },
    { key: 'FEISHU_APP_SECRET', label: '飞书应用密钥' }
  ];
  const optionalVars = [
    { key: 'FEISHU_BITABLE_APP_TOKEN', label: '多维表格 App Token' },
    { key: 'FEISHU_BITABLE_TABLE_ID', label: '多维表格 Table ID' },
    { key: 'FEISHU_BITABLE_URL', label: '多维表格链接' }
  ];

  const missing = requiredVars.filter((v) => !process.env[v.key]);
  const configuredOptionals = optionalVars.filter((v) => process.env[v.key]);

  return {
    configured: missing.length === 0,
    missingVars: missing.map((v) => ({ key: v.key, label: v.label })),
    hasAppToken: !!process.env.FEISHU_BITABLE_APP_TOKEN,
    hasTableId: !!process.env.FEISHU_BITABLE_TABLE_ID,
    hasBitableUrl: !!process.env.FEISHU_BITABLE_URL
  };
}

router.get('/status', (_req, res) => {
  const config = checkFeishuConfig();
  res.json({
    ...config,
    hint: config.configured
      ? '飞书 API 已配置，可使用同步功能。'
      : `缺少必要环境变量：${config.missingVars.map((v) => v.label).join('、')}。请在 backend/.env 文件中配置后重启后端。`
  });
});

router.post('/sync', async (req, res) => {
  try {
    const sourceId = req.body?.sourceId || req.query.sourceId;
    const config = checkFeishuConfig();
    if (!config.configured) {
      return res.status(400).json({
        configured: false,
        missingVars: config.missingVars,
        message: `飞书未配置，缺少环境变量：${config.missingVars.map((v) => v.label).join('、')}。请在 backend/.env 文件中配置后重启后端。`,
        hint: '请参考 README 中的飞书 API 接入说明配置环境变量。'
      });
    }

    // 支持前端传入自定义 bitable URL / table ID
    const overrides = {};
    if (req.body?.bitableUrl) overrides.bitableUrl = req.body.bitableUrl;
    if (req.body?.tableId) overrides.tableId = req.body.tableId;

    const { source, workorders: parsedWorkorders } = await fetchFeishuWorkorders(sourceId, overrides);
    const workorders = analyzeWorkorders(parsedWorkorders);
    await replaceWorkorders(workorders, source);

    return res.json({
      message: `飞书同步成功，共同步 ${workorders.length} 条记录`,
      source: { id: source.id, name: source.name, provider: source.provider },
      syncedAt: new Date().toISOString(),
      count: workorders.length,
      workorders,
      stats: buildStats(workorders)
    });
  } catch (error) {
    const fallbackSource = getDataSource(req.body?.sourceId || req.query.sourceId);
    const message = error.message || '飞书同步失败';
    const isAuthError = message.includes('app_id') || message.includes('app_secret') || message.includes('tenant_access_token') || message.includes('unauthorized') || message.toLowerCase().includes('auth');

    return res.status(400).json({
      source: { id: fallbackSource.id, name: fallbackSource.name, provider: fallbackSource.provider },
      message,
      hint: isAuthError
        ? '飞书认证失败，请检查 FEISHU_APP_ID 和 FEISHU_APP_SECRET 是否正确。'
        : message.includes('table_id')
          ? '缺少多维表格 ID，请配置 FEISHU_BITABLE_TABLE_ID 或 FEISHU_BITABLE_URL。'
          : message.includes('app_token') || message.includes('wiki')
            ? '无法解析多维表格 App Token，请检查 FEISHU_BITABLE_URL 或 FEISHU_BITABLE_APP_TOKEN。'
            : '请确认飞书多维表格链接正确且有权限访问。'
    });
  }
});

// ── POST /api/feishu/sync-all ──
// 统一同步端点：一次调用完成工单 + 评论同步，含字段覆盖率诊断
router.post('/sync-all', async (req, res) => {
  try {
    const sourceId = req.body?.sourceId || req.query.sourceId;
    const config = checkFeishuConfig();
    if (!config.configured) {
      return res.status(400).json({
        configured: false,
        missingVars: config.missingVars,
        message: `飞书未配置，缺少环境变量：${config.missingVars.map((v) => v.label).join('、')}。请在 backend/.env 文件中配置后重启后端。`,
        hint: '请参考 README 中的飞书 API 接入说明配置环境变量。'
      });
    }

    const overrides = {};
    if (req.body?.bitableUrl) overrides.bitableUrl = req.body.bitableUrl;
    if (req.body?.tableId) overrides.tableId = req.body.tableId;

    const result = await syncAll(sourceId, overrides);

    // ── 自动保存自定义数据源 ──
    if (overrides.bitableUrl) {
      try {
        const tableMatch = String(overrides.bitableUrl).match(/[?&]table=([^&#]+)/);
        await saveDataSource({
          id: sourceId,
          name: result.source.name,
          provider: result.source.provider,
          bitableUrl: overrides.bitableUrl,
          tableId: overrides.tableId || tableMatch?.[1] || '',
          isActive: true
        });
        await setActiveDataSource(sourceId);
        console.log(`[feishu] 数据源已持久化: ${sourceId}`);
      } catch (e) {
        console.warn(`[feishu] 数据源持久化失败: ${e.message}`);
      }
    }

    // 构建用户友好的消息
    const parts = [`工单同步成功：${result.workorders.count} 条`];
    if (result.comments.rawCount > 0) {
      parts.push(`评论同步：${result.comments.savedCount} 条新增`);
    } else if (result.comments.error) {
      parts.push(`评论同步失败：${result.comments.error}`);
    } else {
      parts.push('未拉取评论或评论为空');
    }

    return res.json({
      success: true,
      message: parts.join('，'),
      ...result
    });
  } catch (error) {
    const fallbackSource = getDataSource(req.body?.sourceId || req.query.sourceId);
    const message = error.message || '飞书统一同步失败';
    const isAuthError = message.includes('app_id') || message.includes('app_secret')
      || message.includes('tenant_access_token') || message.includes('unauthorized')
      || message.toLowerCase().includes('auth');

    return res.status(400).json({
      success: false,
      source: { id: fallbackSource.id, name: fallbackSource.name, provider: fallbackSource.provider },
      message,
      hint: isAuthError
        ? '飞书认证失败，请检查 FEISHU_APP_ID 和 FEISHU_APP_SECRET 是否正确。'
        : message.includes('table_id')
          ? '缺少多维表格 ID，请配置 FEISHU_BITABLE_TABLE_ID 或 FEISHU_BITABLE_URL。'
          : message.includes('app_token') || message.includes('wiki')
            ? '无法解析多维表格 App Token，请检查 FEISHU_BITABLE_URL 或 FEISHU_BITABLE_APP_TOKEN。'
            : '请确认飞书多维表格链接正确且有权限访问。'
    });
  }
});

// ── 数据源管理 API ──

/** GET /api/feishu/sources — 获取所有已持久化的数据源 */
router.get('/sources', async (_req, res) => {
  try {
    const sources = await getAllDataSources();
    res.json({ sources });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/** DELETE /api/feishu/sources/:id — 删除数据源 */
router.delete('/sources/:id', async (req, res) => {
  try {
    await deleteDataSource(req.params.id);
    res.json({ success: true, message: `数据源 ${req.params.id} 已删除` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/** POST /api/feishu/sources/:id/activate — 设为活跃数据源 */
router.post('/sources/:id/activate', async (req, res) => {
  try {
    await setActiveDataSource(req.params.id);
    res.json({ success: true, message: `已切换到数据源 ${req.params.id}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
