# 星轨对位（Star Track）

对称空间闯关解谜：给出对称轴与轴一侧已摆好的星点，在另一侧补点，让整体满足指定对称关系。单人、每关 3–6 分钟、7 章 40 关。

工程骨架沿用 game-hub 工作区内 `001_top-cow-card-game`（顶牛子）的开发框架：

- uni-app + Vue3 页面与构建（`npm run dev:h5` / `build:h5`）
- 纯 JS 核心逻辑 + Vitest（`vitest.config.js` 不加载 uni 插件，node 环境跑核心测试）
- `server/` 同端口静态托管 + ws 骨架，`scripts/build-server.mjs` 用 esbuild 打单文件
- 音效由脚本零依赖合成（`npm run gen:sounds`）

## 快速开始

> 依赖集中在工作区根 `node_modules`，项目目录内无需 `npm install`。

```bash
npm run dev:h5        # 浏览器开发
npm test              # 219 个用例（核心逻辑 + 关卡数据 + 目标集快照 + 40 关演练 + 组件 + 页面接线）
npm run validate:levels   # 40 关数据体检表
npm run verify        # CI 同款：关卡校验 + 全部测试 + H5 构建
npm run gen:golden    # 关卡目标集快照更新（改了关卡数据后手动跑）
npm run build:h5      # 产物 dist/build/h5
npm run build:server  # 产物 server/server.bundle.mjs（自包含）
node server/server.bundle.mjs   # 同端口托管 dist/build/h5，端口 3005
```

## 测试分层

- `star-{symmetry,judge,levels,progress,hint}.test.js`：node 环境纯逻辑，覆盖六类对称的群运算、判定口径、40 关数据、存档与提示选择。
- `star-golden.test.js`：40 关目标集黄金快照（`tests/fixtures/level-targets.golden.json`），任何数据或对称实现改动导致目标点变化都会逐关报差异；确认无误后用 `npm run gen:golden` 更新。
- `star-playthrough.test.js`：40 关全量通关演练——用真实 `useStar` 状态机把每关目标点逐颗落下再提交，断言 `pass` 且三星；另含落错点失败/清空重来、提示点必属目标集。
- `star-wiring.test.js`：扫所有 `.vue`，模板里每个 `@tap/@change/...` 的处理函数都必须在 `<script setup>` 里真的有定义（防止「按钮写着 handler、脚本没写」这类断线）。
- `star-components.test.js` / `star-game-page.test.js`：jsdom 环境挂载组件与完整 game 页，真触发落点、方向盘、撤销、清空、提交、通关、存档。
  - 组件测试用 `// @vitest-environment jsdom` 单文件切换环境。
  - 未经 uni 编译时 `@tap` 是原始事件名，测试里用 `trigger('tap')` 触发。

## 目录

```
src/
  core/star/
    symmetry.js    # 六类对称的矩阵群、轴格、方向变换（唯一数学实现）
    judge.js       # 目标集推导 + 判定（对外只给 pass / deviations）
    levels.js      # 关卡装配、合法性校验、星级规则
    levelData.js   # 唯一 import JSON 的入口
    progress.js    # 进度存档（storage 可注入）
    hint.js        # 提示选择（缺点优先、多点兜底）
    validate.js    # 关卡数据硬约束校验（CI 可用）
  composables/
    useStar.js     # 单局状态机：落点/撤销/清空/提示/提交/重开
    useSound.js    # 音效实例池 + 静音持久化
  components/star/ # StarBoard / TopHud / BottomBar / DirectionPad / ResultSheet / GuideOverlay
  pages/star/      # index 大厅 / levels 星图册 / game 关卡 / help 规则
  data/levels.v1.json
scripts/
  validate-levels.mjs
  gen-sounds.mjs
  gen-golden.mjs
  build-server.mjs
server/
  index.js         # 静态托管 + /api/health + ws health 路由
  port.js          # PORT > config.json > 3005
tests/             # 12 个测试文件：核心逻辑 / 关卡数据 / 目标集快照 / 40 关演练 / 组件 / 页面接线
docs/星轨对位/      # 需求文档、技术方案、关卡数据
```

## 判定口径（唯一实现）

`T = 群元素像(源点)`，缺点 `M = T\\P`，多点 `E = P\\T`；`M` 与 `E` 同时为空才通过，偏差数 `D = |M| + |E|`。残星与轴格永不参与判定。UI 只拿 `{ pass, deviations }`，不泄露具体错点。
