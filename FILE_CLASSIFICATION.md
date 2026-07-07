# 项目文件分类整理

> 更新时间：2026-07-07

---

## 📂 整体结构概览

```
workorder-dashboard/
├── frontend/              ← React 前端 (Vite + ECharts)
│   ├── public/            ← 静态资源
│   ├── src/
│   │   ├── api/           ← 后端 API 调用
│   │   ├── components/    ← UI 组件
│   │   │   └── commandCenter/ ← 生产指挥舱子组件
│   │   ├── pages/         ← 页面入口
│   │   └── utils/         ← 工具函数
│   └── dist/              ← 构建产物 (gitignored)
├── backend/               ← Node.js 后端 (Express + SQLite)
│   └── src/
│       ├── config/        ← 数据源配置
│       ├── db/            ← 数据库操作
│       ├── routes/        ← API 路由
│       ├── rules/         ← 分类/风险规则
│       └── services/      ← 业务逻辑服务
├── samples/               ← 示例 Excel 数据
├── .claude/               ← Claude Code 配置 (gitignored)
├── .agents/               ← Agent 技能定义 (gitignored)
└── node_modules/          ← 依赖包 (gitignored)
```

---

## 🗂️ 文件分类明细

### 🔴 根目录 — 配置文件

| 文件 | 用途 | 状态 |
|------|------|------|
| `package.json` | 根级脚本（一键启动 dev/build/install） | ✅ 必须 |
| `package-lock.json` | 根级依赖锁 | ✅ 必须 |
| `.gitignore` | Git 忽略规则 | ✅ 必须 |
| `README.md` | 项目文档 | ✅ 必须 |
| `skills-lock.json` | Claude Code 技能锁 | ⚠️ gitignored |

### 🔴 根目录 — 辅助文档 (仅供参考,不进 git)

| 文件 | 用途 | 状态 |
|------|------|------|
| `SITE_STRUCTURE.md` | 网站功能结构说明 | ℹ️ 已 gitignore |
| `ui-preview.html` | 品牌设计系统预览 | ℹ️ 已 gitignore |
| `logo.png` | Logo (与 frontend/public/logo.png 重复) | ❌ 已 gitignore，可删除 |

---

### 🟢 前端 — 入口与页面

| 文件 | 用途 | 状态 |
|------|------|------|
| `frontend/index.html` | HTML 模板 | ✅ 必须 |
| `frontend/package.json` | 前端依赖声明 | ✅ 必须 |
| `frontend/package-lock.json` | 前端依赖锁 | ✅ 必须 |
| `frontend/src/main.jsx` | React 挂载入口 | ✅ 必须 |
| `frontend/src/App.jsx` | React 根组件 | ✅ 必须 |
| `frontend/src/styles.css` | 全局样式 | ✅ 必须 |
| `frontend/src/pages/Dashboard.jsx` | 主页面 — 数据状态 + 布局编排 | ✅ 核心 |

### 🟢 前端 — API 层

| 文件 | 用途 | 状态 |
|------|------|------|
| `frontend/src/api/workorders.js` | 所有后端 API 调用封装 | ✅ 必须 |

### 🟢 前端 — 工具函数

| 文件 | 用途 | 状态 |
|------|------|------|
| `frontend/src/utils/report.js` | HTML 复盘报告导出 | ✅ 必须 |

### 🟢 前端 — UI 组件 (新版，当前使用中)

| 文件 | 用途 | 状态 |
|------|------|------|
| `OverviewDashboard.jsx` | **新版数据看板总览** — 整合 KPI/排名/建议/表格/预测 | ✅ 核心 |
| `KpiCardsNew.jsx` | KPI 指标卡片（新设计） | ✅ 使用中 |
| `ErrorRanking.jsx` | 高频出错内容排行榜 | ✅ 使用中 |
| `SuggestionCards.jsx` | AI 改进建议卡片 | ✅ 使用中 |
| `WeeklyFlow.jsx` | 本周工单流转图 | ✅ 使用中 |
| `Sidebar.jsx` | 侧边栏导航（数据看板/指挥舱/个人主页） | ✅ 使用中 |
| `UserProfile.jsx` | 个人主页 — 数据画像 + AI 建议 | ✅ 使用中 |
| `AutoScrollWorkorders.jsx` | 重点工单自动轮播列表 | ✅ 使用中 |
| `Charts.jsx` | 辅助图表（饼图/柱状图/趋势图） | ✅ 使用中 |
| `TimeAnalysis.jsx` | 时间分析（趋势/时长/积压） | ✅ 使用中 |
| `UploadExcel.jsx` | Excel 上传组件 | ✅ 使用中 |
| `DataSourceBar.jsx` | 数据源选择器 | ✅ 使用中 |
| `ClassificationPanel.jsx` | 分类规则管理滑出面板 | ✅ 使用中 |
| `ErrorDetailModal.jsx` | 高频错误详情弹窗 | ✅ 使用中 |
| `WorkorderDetailModal.jsx` | 工单详情弹窗 | ✅ 使用中 |
| `TabNavigation.jsx` | 指挥舱标签导航 | ✅ 使用中 |

### 🟢 前端 — 图表支持

| 文件 | 用途 | 状态 |
|------|------|------|
| `components/charts/chartTheme.js` | ECharts 主题配置（颜色/样式） | ✅ 必须 |
| `components/charts/commandCenterCharts.js` | 指挥舱图表 option 构建函数 | ✅ 必须 |

### 🟢 前端 — 生产指挥舱组件

| 文件 | 用途 | 状态 |
|------|------|------|
| `commandCenter/OverviewTab.jsx` | 总览标签页 | ✅ 使用中 |
| `commandCenter/DiagnosticsTab.jsx` | 诊断分析标签页 | ✅ 使用中 |
| `commandCenter/TaskListTab.jsx` | 任务列表标签页 | ✅ 使用中 |
| `commandCenter/ForecastTab.jsx` | 风险预测标签页 | ✅ 使用中 |
| `commandCenter/KpiCards.jsx` | 指挥舱 KPI 卡片 | ✅ 使用中 |
| `commandCenter/BhiGauge.jsx` | BHI 健康指数仪表盘 | ✅ 使用中 |
| `commandCenter/StatusDonut.jsx` | 状态分布环形图 | ✅ 使用中 |
| `commandCenter/GradeDensityBar.jsx` | 年级问题密度柱状图 | ✅ 使用中 |
| `commandCenter/ThroughputTrend.jsx` | 吞吐量趋势图 | ✅ 使用中 |
| `commandCenter/CompletionForecast.jsx` | 完成预测图 | ✅ 使用中 |
| `commandCenter/DwellBoxPlot.jsx` | 停留时长箱线图 | ✅ 使用中 |
| `commandCenter/DensityHeatmap.jsx` | 密度热力图 | ✅ 使用中 |
| `commandCenter/TypeStackedBar.jsx` | 类型堆积柱状图 | ✅ 使用中 |
| `commandCenter/WorkloadBar.jsx` | 负载分布图 | ✅ 使用中 |
| `commandCenter/LifecycleScatter.jsx` | 生命周期散点图 | ✅ 使用中 |
| `commandCenter/EffortBubble.jsx` | 工作量气泡图 | ✅ 使用中 |
| `commandCenter/InflowOutflowArea.jsx` | 流入流出面积图 | ✅ 使用中 |
| `commandCenter/TaskFilters.jsx` | 任务筛选器 | ✅ 使用中 |
| `commandCenter/TaskTable.jsx` | 任务表格 | ✅ 使用中 |

---

### 🔵 后端 — 入口与配置

| 文件 | 用途 | 状态 |
|------|------|------|
| `backend/package.json` | 后端依赖声明 | ✅ 必须 |
| `backend/package-lock.json` | 后端依赖锁 | ✅ 必须 |
| `backend/src/index.js` | Express 服务器入口 | ✅ 核心 |
| `backend/src/config/dataSources.js` | 数据源配置 | ✅ 必须 |

### 🔵 后端 — 数据库

| 文件 | 用途 | 状态 |
|------|------|------|
| `backend/src/db/database.js` | SQLite 数据库初始化与操作 | ✅ 必须 |

### 🔵 后端 — API 路由

| 文件 | 用途 | 状态 |
|------|------|------|
| `backend/src/routes/upload.js` | 文件上传接口 | ✅ 必须 |
| `backend/src/routes/workorders.js` | 工单 CRUD 接口 | ✅ 必须 |
| `backend/src/routes/stats.js` | 统计指标接口 | ✅ 必须 |
| `backend/src/routes/classification.js` | 分类规则管理接口 | ✅ 必须 |
| `backend/src/routes/commandCenter.js` | 指挥舱数据接口 | ✅ 必须 |
| `backend/src/routes/feishu.js` | 飞书同步接口（预留） | ✅ 保留 |

### 🔵 后端 — 业务服务

| 文件 | 用途 | 状态 |
|------|------|------|
| `backend/src/services/excelParser.js` | Excel 解析引擎 | ✅ 核心 |
| `backend/src/services/analyzer.js` | 分析引擎（分类/风险/建议） | ✅ 核心 |
| `backend/src/services/commandCenterEtl.js` | 指挥舱数据 ETL 加工 | ✅ 必须 |
| `backend/src/services/feishuClient.js` | 飞书 API 客户端（预留） | ✅ 保留 |

### 🔵 后端 — 规则引擎

| 文件 | 用途 | 状态 |
|------|------|------|
| `backend/src/rules/issueRules.js` | 分类规则加载与管理 | ✅ 必须 |
| `backend/src/rules/riskRules.js` | 风险与不明确规则定义 | ✅ 必须 |
| `backend/src/rules/defaultIssueRules.json` | 默认分类规则 | ✅ 必须 |
| `backend/src/rules/userIssueRules.json` | 用户自定义规则（运行时生成） | ⚠️ gitignored |

### 🔵 后端 — 测试

| 文件 | 用途 | 状态 |
|------|------|------|
| `backend/src/services/analyzer.test.js` | 分析器单元测试 | ✅ 保留 |
| `backend/src/services/excelParser.test.js` | 解析器单元测试 | ✅ 保留 |

---

### 🔴 静态资源

| 文件 | 用途 | 状态 |
|------|------|------|
| `frontend/public/logo.png` | 雪球课堂 Logo | ✅ 必须 |
| `samples/26 年暑假系统课生产.xlsx` | 示例 Excel 测试文件 | ✅ 保留 |

---

## ❌ 可删除文件列表 (旧版组件，已被新版替代)

以下 13 个文件是 V1 版本的 UI 组件，已被新的 `OverviewDashboard` + `KpiCardsNew` + `ErrorRanking` + `SuggestionCards` + `WeeklyFlow` 体系完全替代，**当前代码中没有任何引用**：

| # | 文件 | 原因 |
|---|------|------|
| 1 | `frontend/src/components/StatsCards.jsx` | 旧版指标卡片，已被 `KpiCardsNew.jsx` 替代 |
| 2 | `frontend/src/components/LeftConclusionPanel.jsx` | 旧版左侧结论面板，已被 `OverviewDashboard` 替代 |
| 3 | `frontend/src/components/CarouselSection.jsx` | 仅被 `LeftConclusionPanel` 引用（已废弃） |
| 4 | `frontend/src/components/RightDataPanel.jsx` | 旧版右侧数据面板（Tab切换），已被 `OverviewDashboard` 替代 |
| 5 | `frontend/src/components/FilterToolbar.jsx` | 仅被 `RightDataPanel` 引用（已废弃） |
| 6 | `frontend/src/components/WorkorderTable.jsx` | 仅被 `RightDataPanel` 引用（已废弃） |
| 7 | `frontend/src/components/PendingReviewQueue.jsx` | 仅被 `RightDataPanel` 引用（已废弃） |
| 8 | `frontend/src/components/ReworkList.jsx` | 仅被 `RightDataPanel` 引用（已废弃） |
| 9 | `frontend/src/components/InvalidList.jsx` | 仅被 `RightDataPanel` 引用（已废弃） |
| 10 | `frontend/src/components/ConclusionSection.jsx` | 无任何引用 |
| 11 | `frontend/src/components/FocusWorkorders.jsx` | 无任何引用 |
| 12 | `frontend/src/components/StatusOverview.jsx` | 无任何引用 |
| 13 | `frontend/src/components/TypicalCases.jsx` | 无任何引用 |

---

## 📊 文件统计

| 分类 | 数量 |
|------|------|
| ✅ 使用中的前端组件 (新版) | 15 |
| ✅ 使用中的指挥舱组件 | 19 |
| ✅ 使用中的后端文件 | 16 |
| ✅ 配置文件 | 6 |
| ❌ 旧版可删除组件 | 13 |
| ℹ️ 辅助文档 | 3 |
| **项目总有效文件** | **~56** |
