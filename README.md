# 暑期工单 AI 复盘看板

这是一个网页端工单分析与复盘看板，用于分析暑期生产工单中的高频内容问题、需求不明确问题、反复调整候选和高风险工单。

当前版本支持通过 Excel 上传工单数据，自动解析名为「工单任务」的 sheet，生成统计指标、图表、分析字段和明细表。项目已预留飞书多维表格 API 接入模块，后续可扩展为从飞书读取工单、评论和文档上下文。

## 一、当前已实现功能

- 上传 `.xlsx` / `.xls` Excel 文件。
- 后端解析 Excel 中名为「工单任务」的 sheet。
- 兼容类似 `年级（选择）`、`周（选择）`、`所属类型（选择）` 的飞书导出字段名。
- 将 Excel 数据转换为统一工单结构。
- 自动识别问题一级分类。
- 自动提取问题关键词。
- 自动识别需求不明确及原因。
- 自动生成风险等级。
- 自动识别反复调整候选。
- 使用 SQLite 文件本地保存数据，页面刷新后数据不丢失。
- 重新上传 Excel 后覆盖当前数据。
- 展示顶部指标卡。
- 展示 ECharts 图表。
- 展示工单明细表。
- 支持年级、周、所属类型、问题一级分类、需求不明确、风险等级、状态、负责人和问题描述关键词筛选。
- 预留飞书同步按钮和后端接口。
- 提供后端测试脚本。

## 二、技术栈

### 前端

- React
- Vite
- ECharts
- TanStack Table

### 后端

- Node.js
- Express
- xlsx
- sql.js，本地持久化为 SQLite 文件

## 三、目录结构

```text
workorder-dashboard/
├─ frontend/
│  ├─ src/
│  │  ├─ pages/
│  │  │  └─ Dashboard.jsx
│  │  ├─ components/
│  │  │  ├─ UploadExcel.jsx
│  │  │  ├─ StatsCards.jsx
│  │  │  ├─ Charts.jsx
│  │  │  └─ WorkorderTable.jsx
│  │  ├─ api/
│  │  │  └─ workorders.js
│  │  ├─ App.jsx
│  │  ├─ main.jsx
│  │  └─ styles.css
│  ├─ index.html
│  └─ package.json
│
├─ backend/
│  ├─ src/
│  │  ├─ index.js
│  │  ├─ routes/
│  │  │  ├─ upload.js
│  │  │  ├─ workorders.js
│  │  │  ├─ stats.js
│  │  │  └─ feishu.js
│  │  ├─ services/
│  │  │  ├─ excelParser.js
│  │  │  ├─ analyzer.js
│  │  │  ├─ feishuClient.js
│  │  │  ├─ analyzer.test.js
│  │  │  └─ excelParser.test.js
│  │  ├─ rules/
│  │  │  ├─ issueRules.js
│  │  │  └─ riskRules.js
│  │  └─ db/
│  │     └─ database.js
│  └─ package.json
│
├─ samples/
│  └─ 26 年暑假系统课生产.xlsx
│
└─ README.md
```

## 四、运行环境要求

请先确认电脑已经安装：

- Node.js，建议版本 18 或以上。
- npm，安装 Node.js 时通常会一起安装。

检查方式：

```bash
node -v
npm -v
```

如果能看到版本号，说明环境可用。

## 五、如何启动项目

注意：不要直接双击打开 `frontend/index.html`，React + Vite 项目必须通过 Vite 开发服务器访问。

### 1. 解压项目

将压缩包解压到任意目录，例如：

```text
D:\workorder-dashboard
```

下面命令中的路径请根据你实际解压位置调整。

### 2. 启动后端

打开一个终端，进入后端目录：

```bash
cd D:\workorder-dashboard\backend
npm install
npm run dev
```

后端默认启动在：

```text
http://localhost:3001
```

健康检查地址：

```text
http://localhost:3001/api/health
```

正常返回：

```json
{
  "ok": true
}
```

### 3. 启动前端

再打开一个新的终端，进入前端目录：

```bash
cd D:\workorder-dashboard\frontend
npm install
npm run dev
```

终端会输出类似地址：

```text
http://localhost:5173/
```

用浏览器打开该地址即可。

如果端口 `5173` 被占用，Vite 会自动切换到其他端口，请以终端输出为准。

## 六、如何使用

### 1. 打开页面

浏览器访问前端地址，例如：

```text
http://localhost:5173/
```

页面顶部会显示后端连接状态。如果显示“后端已连接”，说明前后端联通正常。

### 2. 上传 Excel

点击页面中的“选择 Excel 文件”，上传包含「工单任务」sheet 的 Excel 文件。

当前项目自带一个示例文件：

```text
samples/26 年暑假系统课生产.xlsx
```

可以先用这个文件测试。

### 3. 查看分析结果

上传成功后，页面会自动展示：

- 总工单数
- 未完成工单数
- 完成率
- 需求不明确数
- 高风险工单数
- 高频问题 Top1
- 所属类型排行图
- 问题一级分类排行图
- 需求不明确原因排行图
- 年级问题分布图
- 周次问题分布图
- 工单明细表

### 4. 使用筛选和搜索

明细表上方支持筛选：

- 年级
- 周
- 所属类型
- 问题一级分类
- 是否需求不明确
- 风险等级
- 状态
- 负责人
- 问题描述关键词

高风险工单和需求不明确工单会有明显标识。

### 5. 飞书同步按钮

页面中有“从飞书同步”按钮。当前版本只是预留入口，点击后会提示：

```text
飞书同步功能待接入
```

后续真实接入飞书时，会由后端读取飞书多维表格，前端不会直接请求飞书 API，避免暴露 App Secret。

## 七、Excel 格式要求

Excel 中必须包含名为：

```text
工单任务
```

的 sheet。

建议包含以下字段：

- 课程定位
- 年级
- 周
- 所属类型
- 问题描述
- 状态
- 上报人
- 最后更新时间
- 工单默认负责人
- 教研负责人

字段名可以兼容飞书导出形式，例如：

- 年级（选择）
- 周（选择）
- 所属类型（选择）
- 状态（选择）

## 八、后端接口

后端默认地址：

```text
http://localhost:3001
```

已实现接口：

- `GET /api/health`：健康检查。
- `POST /api/upload`：上传并解析 Excel。
- `GET /api/workorders`：获取当前 SQLite 中保存的工单列表。
- `GET /api/stats`：获取看板统计信息。
- `GET /api/workorders/stats`：兼容保留的统计接口。
- `POST /api/feishu/sync`：飞书同步预留接口。

## 九、后端测试

进入后端目录后运行：

```bash
cd backend
npm test
```

测试覆盖：

- 字段名兼容解析，如 `年级（选择）`、`周（选择）`。
- 缺失「工单任务」sheet 时抛出明确错误。
- 示例 Excel 文件可解析。
- 问题一级分类识别。
- 问题关键词提取。
- 需求不明确识别。
- 风险等级识别。
- 反复调整候选识别。
- 统计排行生成。

## 十、前端构建

如果需要构建前端生产包：

```bash
cd frontend
npm run build
```

构建产物会生成在：

```text
frontend/dist
```

当前项目使用 ECharts，构建时如果出现 chunk 体积提示属于正常提示，不影响运行。

## 十一、本地数据保存位置

上传后的数据会保存为本地 SQLite 文件：

```text
backend/src/workorders.sqlite
```

重新上传 Excel 会覆盖当前工单数据。

如果需要清空本地数据，可以在停止后端服务后删除该文件，再重新启动后端。

## 十二、常见问题

### 1. 页面空白怎么办？

不要直接打开：

```text
frontend/index.html
```

请先运行：

```bash
cd frontend
npm run dev
```

然后访问终端输出的地址，例如：

```text
http://localhost:5173/
```

### 2. 页面显示“后端未连接”怎么办？

请确认后端已经启动：

```bash
cd backend
npm run dev
```

然后访问：

```text
http://localhost:3001/api/health
```

如果不能返回 `{ "ok": true }`，说明后端没有正常启动。

### 3. 上传失败并提示找不到 sheet 怎么办？

请确认 Excel 中存在名为：

```text
工单任务
```

的 sheet。名称需要完全一致。

### 4. 依赖包在哪里？

压缩包默认不包含 `node_modules`。同事解压后需要分别在 `backend` 和 `frontend` 目录执行：

```bash
npm install
```

依赖会安装到：

```text
backend/node_modules
frontend/node_modules
```

## 十三、后续可扩展方向

- 接入飞书多维表格 API。
- 读取飞书评论、文档和附件上下文。
- 增加 AI 复盘总结模块。
- 增加典型案例列表。
- 增加复盘报告导出。
- 增加历史批次和趋势对比。



启动方式
后端：

cd d:\A工作\复盘看板\workorder-dashboard\backend
npm run dev
前端：

cd d:\A工作\复盘看板\workorder-dashboard\frontend
npm run dev
浏览器打开 Vite 输出地址，通常是：

http://localhost:5173/
