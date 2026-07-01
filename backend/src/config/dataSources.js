export const defaultSourceId = 'summer_2026';

export const dataSources = [
  {
    id: 'summer_2026',
    name: '2026暑期系统课生产工单',
    provider: 'feishu_bitable',
    appTokenEnv: 'FEISHU_BITABLE_APP_TOKEN',
    tableIdEnv: 'FEISHU_BITABLE_TABLE_ID',
    bitableUrlEnv: 'FEISHU_BITABLE_URL'
  }
];

export function getDataSource(sourceId = defaultSourceId) {
  return dataSources.find((source) => source.id === sourceId) || dataSources[0];
}
