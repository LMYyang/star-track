# 星轨对位（Star Track）

对称空间闯关解谜：给出对称轴与轴一侧已摆好的星点，在另一侧补点，让整体满足指定对称关系。单人、每关 3–6 分钟、17 章 132 关。

- v1.1：第 8 章「星旋」（四重旋转）、第 9 章「暗域」（禁落格）、第 10 章「织星」（综合）。
- **v1.3**：新增第 15 章「星芒」——新对称元素**八重对称 `d4`**（旋转 90° × 过中心镜轴合成的 8 阶群，一个源点补七颗，镜轴整条为死格）；第 16 章「星阵」——**平移复制 `t`**（沿向量平移 1–3 步，群阶 = 步数 + 1，棋盘上有方向虚线箭头）；第 17 章「终局·二」（星芒/星阵与全部旧元素混排 + 盲判）。关卡数据改为 `levels.v4.json`（132 关 / 17 章），每章新增关卡 12 关，难度系数公式补上「目标数 15/21」与「八重对称」两项。
- **v1.2**：新增第 11 章「双镜」——新对称元素**复合双镜**（两条斜镜 `d1 + d2` 合成的四阶群，一个源点补三点，两轴交点为死点）；第 12 章「深井」（9×9 + 密集暗域）、第 13 章「星锁」（限次提交 2–3 次 + 低提示）、第 14 章「万象」（双镜 + 暗域 + 残星 + 箭头 + 盲判全开）。关卡数据改为 `levels.v3.json`（96 关），`levels.v1/v2.json` 保留作历史。每关新增可量化的**难度系数 1–5**（`difficultyOf`，HUD 与星图册共用）。

工程骨架沿用 game-hub 工作区内 `001_top-cow-card-game`（顶牛子）的开发框架：

- uni-app + Vue3 页面与构建（`npm run dev:h5` / `build:h5`）
- 纯 JS 核心逻辑 + Vitest（`vitest.config.js` 不加载 uni 插件，node 环境跑核心测试）
- `server/` 同端口静态托管 + ws 骨架，`scripts/build-server.mjs` 用 esbuild 打单文件
- 音效由脚本零依赖合成（`npm run gen:sounds`）

## 快速开始

> 依赖集中在工作区根 `node_modules`，项目目录内无需 `npm install`。

```bash
npm run dev:h5        # 浏览器开发
npm test              # 443 个用例（核心逻辑 + 关卡数据 + 目标集快照 + 132 关演练 + 组件 + 页面接线）
npm run validate:levels   # 132 关数据体检表（含暗域列）
npm run verify        # CI 同款：关卡校验 + 全部测试 + H5 构建
npm run gen:golden    # 关卡目标集快照更新（改了关卡数据后手动跑）
npm run build:h5      # 产物 dist/build/h5
npm run build:server  # 产物 server/server.bundle.mjs（自包含）
node server/server.bundle.mjs   # 同端口托管 dist/build/h5，端口 3005
```

## 测试分层

- `star-{symmetry,judge,levels,progress,hint}.test.js`：node 环境纯逻辑，覆盖十类对称（含四重旋转 `r`、复合双镜 `g`、八重对称 `d4`、平移 `t`）的群运算、判定口径、132 关数据、暗域约束、存档与提示选择。
- `star-golden.test.js`：132 关目标集黄金快照（`tests/fixtures/level-targets.golden.json`），任何数据或对称实现改动导致目标点变化都会逐关报差异；确认无误后用 `npm run gen:golden` 更新。
- `star-playthrough.test.js`：132 关全量通关演练——用真实 `useStar` 状态机把每关目标点逐颗落下再提交，断言 `pass` 且三星；另含落错点失败/清空重来、暗域拒落、提示点必属目标集。
- `star-wiring.test.js`：扫所有 `.vue`，模板里每个 `@tap/@change/...` 的处理函数都必须在 `<script setup>` 里真的有定义（防止「按钮写着 handler、脚本没写」这类断线）。
- `star-components.test.js` / `star-game-page.test.js`：jsdom 环境挂载组件与完整 game 页，真触发落点、方向盘、撤销、清空、提交、通关、存档。
  - 组件测试用 `// @vitest-environment jsdom` 单文件切换环境。
  - 未经 uni 编译时 `@tap` 是原始事件名，测试里用 `trigger('tap')` 触发。

## 目录

```
src/
  core/star/
    symmetry.js    # 七类对称的矩阵群（含 C4 旋转）、轴格、方向变换（唯一数学实现）
    judge.js       # 目标集推导 + 判定（对外只给 pass / deviations）
    levels.js      # 关卡装配、合法性校验（暗域/容量/箭头同格）、星级规则
    levelData.js   # 唯一 import JSON 的入口
    progress.js    # 进度存档（storage 可注入）
    hint.js        # 提示选择（缺点优先、多点兜底）
    validate.js    # 关卡数据硬约束校验（CI 可用）
  composables/
    useStar.js     # 单局状态机：落点/撤销/清空/提示/提交/重开
    useSound.js    # 音效实例池 + 静音持久化
  components/star/ # StarBoard / TopHud / BottomBar / DirectionPad / ResultSheet / GuideOverlay
  pages/star/      # index 大厅 / levels 星图册 / game 关卡 / help 规则
  data/levels.v4.json     # 132 关（v2 的 64 关原样保留在前 64 位，v1/v2 留档）
scripts/
  validate-levels.mjs
  gen-sounds.mjs
  gen-golden.mjs
  build-server.mjs
server/
  index.js         # 静态托管 + /api/health + ws health 路由
  port.js          # PORT > config.json > 3005
tests/             # 12 个测试文件：核心逻辑 / 关卡数据 / 目标集快照 / 132 关演练 / 组件 / 页面接线
docs/星轨对位/      # 需求文档、技术方案、关卡数据
```

## 判定口径（唯一实现）

`T = 群元素像(源点)`，缺点 `M = T\\P`，多点 `E = P\\T`；`M` 与 `E` 同时为空才通过，偏差数 `D = |M| + |E|`。残星、轴格与暗域永不参与判定（暗域同时禁落）。UI 只拿 `{ pass, deviations }`，不泄露具体错点。
