import { getAllDataSources } from '../db/database.js';

export const defaultSourceId = 'summer_2026';

/** 硬编码的默认数据源（文件配置） */
export const staticDataSources = [
  {
    id: 'summer_2026',
    name: '2026暑期系统课生产工单',
    provider: 'feishu_bitable',
    appTokenEnv: 'FEISHU_BITABLE_APP_TOKEN',
    tableIdEnv: 'FEISHU_BITABLE_TABLE_ID',
    bitableUrlEnv: 'FEISHU_BITABLE_URL'
  }
];

/**
 * 复合数据源列表：静态配置 + 数据库中持久化的自定义数据源
 * 数据库中的同名源会覆盖静态配置
 */
export async function getDataSources() {
  const dbSources = await getAllDataSources();
  const merged = [...staticDataSources];

  dbSources.forEach((dbSrc) => {
    const existingIdx = merged.findIndex((s) => s.id === dbSrc.id);
    const mapped = {
      id: dbSrc.id,
      name: dbSrc.table_name || dbSrc.name,
      provider: dbSrc.provider,
      bitableUrl: dbSrc.bitable_url,
      appToken: dbSrc.app_token,
      tableId: dbSrc.table_id,
      isActive: dbSrc.is_active
    };
    if (existingIdx >= 0) {
      // 合并：DB 中的 URL 字段优先
      merged[existingIdx] = { ...merged[existingIdx], ...mapped };
    } else {
      merged.push(mapped);
    }
  });

  return merged;
}

/**
 * 获取数据源列表（同步版本，供路由使用）
 * 注意：这是从 module scope 的静态列表，不包含 DB 数据源
 */
export const dataSources = staticDataSources;

export function getDataSource(sourceId = defaultSourceId) {
  return staticDataSources.find((source) => source.id === sourceId) || staticDataSources[0];
}
