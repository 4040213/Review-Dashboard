import 'dotenv/config';
import { getTenantAccessToken } from './feishuClient.js';

const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';

// ── 辅助 ──

async function feishuRequest(path, token, options = {}) {
  const response = await fetch(`${FEISHU_API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || (data.code !== undefined && data.code !== 0)) {
    const err = new Error(data.msg || data.message || `飞书接口请求失败：${path}`);
    err.code = data.code;
    throw err;
  }
  return data;
}

// ── 飞书评论 content.elements[] → 纯文本 ──

function parseContentElements(elements) {
  if (!elements || !Array.isArray(elements)) return '';
  return elements
    .map((el) => {
      if (el.type === 'text_run' && el.text_run) return el.text_run.text || '';
      if (el.type === 'person' && el.person) return el.person.name ? '@' + el.person.name : '@用户';
      if (el.type === 'docs_link' && el.docs_link) return el.docs_link.url || '';
      return '';
    })
    .join('');
}

// ── 格式化飞书时间戳 ──

function formatFeishuTime(value) {
  if (!value) return '';
  const num = Number(value);
  if (!Number.isNaN(num) && num > 0) {
    const ms = num < 10_000_000_000 ? num * 1000 : num;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
  }
  return String(value);
}

// ── 批量获取用户姓名 ──
// 使用 GET /contact/v3/users/{user_id}?user_id_type=open_id
// 如果无通讯录权限则静默降级，直接用 user_id 显示

async function batchResolveUserNames(token, userIds) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return {};

  const nameMap = {};
  // 限制最多解析 50 个用户
  const toResolve = unique.slice(0, 50);

  // 并发查询（最多 10 个并发）
  const batchSize = 10;
  for (let i = 0; i < toResolve.length; i += batchSize) {
    const batch = toResolve.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (userId) => {
        try {
          const data = await feishuRequest(
            `/contact/v3/users/${encodeURIComponent(userId)}?user_id_type=open_id`,
            token
          );
          return { userId, name: data.data?.user?.name || userId };
        } catch {
          return { userId, name: userId };
        }
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled') {
        nameMap[r.value.userId] = r.value.name;
      }
    }
  }

  // 未解析的用 user_id
  for (const uid of unique) {
    if (!nameMap[uid]) nameMap[uid] = uid;
  }

  return nameMap;
}

// ── 获取 bitable app token ──

async function getAppToken(token) {
  const configuredToken = process.env.FEISHU_BITABLE_APP_TOKEN || process.env.FEISHU_BASE_APP_TOKEN;
  if (configuredToken) return configuredToken;

  const bitableUrl = process.env.FEISHU_BITABLE_URL;
  if (!bitableUrl) throw new Error('缺少 FEISHU_BITABLE_URL 或 FEISHU_BITABLE_APP_TOKEN 配置');

  const wikiMatch = String(bitableUrl).match(/\/wiki\/([^/?#]+)/);
  const wikiToken = wikiMatch?.[1] || '';
  if (!wikiToken) throw new Error('无法从飞书多维表格链接解析 wiki token');

  const data = await feishuRequest(
    `/wiki/v2/spaces/get_node?token=${encodeURIComponent(wikiToken)}`,
    token
  );
  const appToken = data.data?.node?.obj_token;
  if (!appToken) throw new Error('无法从飞书 wiki 节点解析多维表格 app_token');
  return appToken;
}

function getTableId() {
  return process.env.FEISHU_TABLE_ID || process.env.FEISHU_BITABLE_TABLE_ID || '';
}

// ── 探针函数 ──

export async function probeComments() {
  const token = await getTenantAccessToken();
  const appToken = await getAppToken(token);

  console.log('[feishuComments:probe] ────── 探针开始 ──────');
  console.log(`[feishuComments:probe] app_token: ${appToken}`);

  let rawItems = [];
  let pageToken = '';

  try {
    do {
      const params = new URLSearchParams({ file_type: 'bitable', page_size: '10' });
      if (pageToken) params.set('page_token', pageToken);

      const url = `/drive/v1/files/${encodeURIComponent(appToken)}/comments?${params.toString()}`;
      const data = await feishuRequest(url, token);
      const items = data.data?.items || [];
      rawItems.push(...items);
      pageToken = data.data?.page_token || '';
    } while (pageToken && rawItems.length < 10);

    console.log(`[feishuComments:probe] 获取 ${rawItems.length} 条原始评论`);

    const sampleCount = Math.min(2, rawItems.length);
    for (let i = 0; i < sampleCount; i++) {
      console.log(`[feishuComments:probe] ── 评论 #${i + 1} 完整 JSON ──`);
      console.log(JSON.stringify(rawItems[i], null, 2));
    }

    console.log('[feishuComments:probe] ────── 探针结束 ──────');
    return { rawItems };
  } catch (error) {
    console.error(`[feishuComments:probe] 失败: ${error.message}`);
    throw error;
  }
}

// ── 正式同步 ──

export async function fetchAllComments(overrides = {}) {
  const token = await getTenantAccessToken();
  let appToken, tableId;

  if (overrides.bitableUrl) {
    // 从自定义 URL 解析 app_token
    const wikiMatch = String(overrides.bitableUrl).match(/\/wiki\/([^/?#]+)/);
    const wikiToken = wikiMatch?.[1] || '';
    if (wikiToken) {
      const wikiData = await feishuRequest(
        `/wiki/v2/spaces/get_node?token=${encodeURIComponent(wikiToken)}`,
        token
      );
      appToken = wikiData.data?.node?.obj_token;
      if (!appToken) throw new Error('无法从提供的链接解析多维表格 app_token');
    } else {
      throw new Error('提供的链接格式不正确');
    }
    const tableMatch = String(overrides.bitableUrl).match(/[?&]table=([^&#]+)/);
    tableId = tableMatch?.[1] || '';
  } else {
    appToken = await getAppToken(token);
    tableId = getTableId();
  }

  if (!appToken) throw new Error('缺少 app_token');
  console.log(`[feishuComments] 同步评论，app_token=${appToken}`);

  // 拉取所有原始评论（限制最大 50 页 / 5000 条，防止超时）
  const MAX_PAGES = 50;
  const MAX_ITEMS = 5000;
  let rawItems = [];
  let pageToken = '';
  let pageCount = 0;

  do {
    const params = new URLSearchParams({ file_type: 'bitable', page_size: '100' });
    if (pageToken) params.set('page_token', pageToken);

    const data = await feishuRequest(
      `/drive/v1/files/${encodeURIComponent(appToken)}/comments?${params.toString()}`,
      token
    );
    const items = data.data?.items || [];
    rawItems.push(...items);
    pageToken = data.data?.page_token || '';
    const hasMore = data.data?.has_more;
    pageCount++;

    if (pageCount % 5 === 1 || !hasMore) {
      console.log(`[feishuComments] 第 ${pageCount} 页: ${items.length} 条, 累计 ${rawItems.length} 条, has_more=${hasMore}`);
    }

    // 安全限流
    if (pageCount >= MAX_PAGES) {
      console.log(`[feishuComments] 已达最大页数限制 (${MAX_PAGES} 页)，停止拉取`);
      break;
    }
    if (rawItems.length >= MAX_ITEMS) {
      console.log(`[feishuComments] 已达最大条数限制 (${MAX_ITEMS} 条)，停止拉取`);
      break;
    }
    if (!hasMore) break;
  } while (pageToken);

  console.log(`[feishuComments] 共 ${rawItems.length} 条原始评论`);

  // 收集所有 user_id 用于批量解析姓名
  const allUserIds = new Set();
  for (const raw of rawItems) {
    if (raw.user_id) allUserIds.add(raw.user_id);
    const replies = raw.reply_list?.replies || [];
    for (const reply of replies) {
      if (reply.user_id) allUserIds.add(reply.user_id);
    }
  }

  // 批量解析用户姓名
  console.log(`[feishuComments] 解析 ${allUserIds.size} 个用户姓名...`);
  const nameMap = await batchResolveUserNames(token, [...allUserIds]);
  console.log(`[feishuComments] 姓名解析完成`);

  // 解析评论
  const parsed = [];
  let skippedNoRecordId = 0;

  for (const raw of rawItems) {
    const commentId = raw.comment_id || '';
    const isSolved = Boolean(raw.is_solved);
    const mainAuthorName = nameMap[raw.user_id] || raw.user_id || '';

    // 主评论通常是飞书自动生成的（quote: "记录 X"），实际内容在回复里
    // 但也可能有主评论直接包含内容的情况
    const mainContent = parseContentElements(raw.content?.elements);
    const mainRecordId = raw.extra?.notify_extra?.record || '';

    // 如果主评论有内容和 record_id，保存它
    if (mainContent && mainRecordId) {
      parsed.push({
        feishu_comment_id: commentId,
        feishu_reply_id: '',
        feishu_record_id: mainRecordId,
        feishu_table_id: raw.extra?.notify_extra?.table || tableId || '',
        feishu_view_id: raw.extra?.notify_extra?.view || '',
        content: mainContent,
        author_name: mainAuthorName,
        author_id: raw.user_id || '',
        create_time: formatFeishuTime(raw.create_time),
        update_time: formatFeishuTime(raw.update_time),
        is_solved: isSolved,
        raw_json: JSON.stringify(raw)
      });
    }

    // 处理回复
    const replies = raw.reply_list?.replies || [];
    for (const reply of replies) {
      const replyRecordId = reply.extra?.notify_extra?.record || '';

      if (!replyRecordId) {
        skippedNoRecordId++;
        console.warn(`[feishuComments] ⚠ 跳过无 record_id 的回复: reply_id=${reply.reply_id}`);
        continue;
      }

      const replyContent = parseContentElements(reply.content?.elements);
      const replyAuthorName = nameMap[reply.user_id] || reply.user_id || '';

      parsed.push({
        feishu_comment_id: commentId,
        feishu_reply_id: reply.reply_id || '',
        feishu_record_id: replyRecordId,
        feishu_table_id: reply.extra?.notify_extra?.table || tableId || '',
        feishu_view_id: reply.extra?.notify_extra?.view || '',
        content: replyContent,
        author_name: replyAuthorName,
        author_id: reply.user_id || '',
        create_time: formatFeishuTime(reply.create_time),
        update_time: formatFeishuTime(reply.update_time),
        is_solved: false, // 回复本身没有 is_solved
        raw_json: JSON.stringify(reply)
      });
    }
  }

  console.log(`[feishuComments] 解析完成: ${parsed.length} 条（含回复）, 跳过 ${skippedNoRecordId} 条（无 record_id）`);

  return parsed;
}

// ── 权限检查 ──

export function isPermissionError(error) {
  const msg = (error.message || '').toLowerCase();
  return msg.includes('access denied')
    || msg.includes('scope')
    || msg.includes('permission')
    || error.code === 99991672;
}

export function getPermissionHint() {
  return {
    summary: '飞书应用缺少云文档评论读取权限',
    requiredScope: 'docs:document.comment:read（或 drive:drive:readonly）',
    steps: [
      '1. 打开飞书开放平台 → 应用管理 → 你的应用',
      '2. 权限管理 → 添加权限 → 搜索 "comment" 或 "drive"',
      '3. 添加 docs:document.comment:read',
      '4. 发布新版本并审批通过'
    ]
  };
}
