import express from 'express';
import { fetchAllComments, probeComments, isPermissionError, getPermissionHint } from '../services/feishuComments.js';
import { insertComments, getCommentsByRecordId } from '../db/database.js';

const router = express.Router();

// ── POST /api/sync/comments ──
// 拉取飞书多维表格评论并入库

router.post('/sync/comments', async (req, res) => {
  try {
    // 检查环境变量
    if (!process.env.FEISHU_APP_ID || !process.env.FEISHU_APP_SECRET) {
      return res.status(400).json({
        success: false,
        message: '飞书评论同步失败',
        detail: '缺少飞书配置：FEISHU_APP_ID 或 FEISHU_APP_SECRET 未设置。请在 backend/.env 文件中配置后重启后端。'
      });
    }

    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN || process.env.FEISHU_BASE_APP_TOKEN || '';
    const hasUrl = !!process.env.FEISHU_BITABLE_URL;

    if (!appToken && !hasUrl) {
      return res.status(400).json({
        success: false,
        message: '飞书评论同步失败',
        detail: '缺少多维表格配置：请设置 FEISHU_BITABLE_APP_TOKEN 或 FEISHU_BITABLE_URL。'
      });
    }

    console.log('[comments:sync] 开始同步飞书评论...');

    // 如果请求参数中带有 probe=1，先执行探针
    const doProbe = req.query.probe === '1' || req.body?.probe === true;
    if (doProbe) {
      console.log('[comments:sync] 探针模式：先打印评论原始结构');
      await probeComments();
    }

    // 支持自定义 bitable URL
    const overrides = {};
    if (req.body?.bitableUrl) overrides.bitableUrl = req.body.bitableUrl;

    // 拉取所有评论（通过 Drive API）
    const comments = await fetchAllComments(overrides);
    const rawCommentCount = comments.length;

    if (rawCommentCount === 0) {
      return res.json({
        success: true,
        rawCommentCount: 0,
        savedCommentCount: 0,
        skippedCount: 0,
        hint: '飞书接口返回 0 条评论。请检查：1) 多维表格中是否有评论；2) 飞书应用是否被添加为多维表格协作者；3) 是否申请了云文档评论/多维表格相关权限。'
      });
    }

    // 写入数据库
    const { saved, skipped } = await insertComments(comments);

    console.log(`[comments:sync] 同步完成: 原始 ${rawCommentCount} 条, 保存 ${saved} 条, 跳过 ${skipped} 条`);

    return res.json({
      success: true,
      rawCommentCount,
      savedCommentCount: saved,
      skippedCount: skipped
    });
  } catch (error) {
    console.error(`[comments:sync] 同步失败: ${error.message}`);

    const message = error.message || '飞书评论同步失败';

    // 权限错误：给出明确指引
    if (isPermissionError(error)) {
      const appId = process.env.FEISHU_APP_ID || '';
      const hint = getPermissionHint(appId);
      return res.status(400).json({
        success: false,
        message: '飞书评论同步失败：应用缺少权限',
        detail: message,
        permissionHint: hint
      });
    }

    const isAuthError = message.includes('app_id') || message.includes('app_secret')
      || message.includes('tenant_access_token') || message.toLowerCase().includes('auth')
      || message.includes('unauthorized');

    return res.status(400).json({
      success: false,
      message: '飞书评论同步失败',
      detail: message,
      hint: isAuthError
        ? '飞书认证失败，请检查 FEISHU_APP_ID 和 FEISHU_APP_SECRET 是否正确。'
        : '请确认飞书多维表格链接正确且有权限访问。'
    });
  }
});

// ── GET /api/tickets/:recordId/comments ──
// 获取某条工单的所有评论

router.get('/tickets/:recordId/comments', async (req, res) => {
  try {
    const { recordId } = req.params;
    if (!recordId) {
      return res.status(400).json({ success: false, message: '缺少 recordId 参数' });
    }

    const comments = await getCommentsByRecordId(recordId);

    return res.json({
      success: true,
      recordId,
      count: comments.length,
      comments: comments.map((c) => ({
        content: c.content,
        author_name: c.author_name,
        create_time: c.create_time,
        update_time: c.update_time,
        is_solved: c.is_solved,
        feishu_comment_id: c.feishu_comment_id,
        feishu_reply_id: c.feishu_reply_id
      }))
    });
  } catch (error) {
    console.error(`[comments] 查询评论失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: '查询评论失败',
      detail: error.message
    });
  }
});

export default router;
