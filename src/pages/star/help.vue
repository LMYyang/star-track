<template>
  <view class="page">
    <view class="nav">
      <view class="icon-btn" @tap="back"><text class="icon">‹</text></view>
      <text class="nav-title">规则</text>
      <view class="nav-right" />
    </view>

    <view class="card">
      <text class="h">一句话</text>
      <text class="p">给出对称轴和轴一侧已经摆好的星点，在另一侧补点，让整张星图满足指定的对称关系。</text>
    </view>

    <view class="card">
      <text class="h">怎么玩</text>
      <view class="step"><text class="n">1</text><text class="p">看清轴的方向，以及轴上是实心四芒星（源点）。</text></view>
      <view class="step"><text class="n">2</text><text class="p">点格点落星；落点会吸附到最近的格点。再点一次已放下的星可以移除。</text></view>
      <view class="step"><text class="n">3</text><text class="p">点「提交」校验。系统只告诉你通过 / 偏差几处，不会指出哪一颗错。</text></view>
      <text class="p dim">补对了就通关；提交次数用尽仍未通过则本关失败，可「重新观测」。</text>
    </view>

    <view class="card">
      <text class="h">十种对称关系</text>
      <view v-for="it in SYMS" :key="it.name" class="sym-row">
        <text class="sym-name">{{ it.name }}</text>
        <text class="sym-formula">{{ it.formula }}</text>
        <text class="sym-tip">{{ it.tip }}</text>
      </view>
      <text class="p dim">轴上那一格（轴格）不能落星，也不参与判定。</text>
    </view>

    <view class="card">
      <text class="h">星级</text>
      <view class="star-line"><text class="stars gold">★★★</text><text class="p">零失误、零提示</text></view>
      <view class="star-line"><text class="stars">★★☆</text><text class="p">失误不超过 2 次、提示不超过 1 次</text></view>
      <view class="star-line"><text class="stars">★☆☆</text><text class="p">其余情况通关</text></view>
      <text class="p dim">星级只记录历史最好成绩，重开、重进都不会降级。</text>
    </view>

    <view class="card">
      <text class="h">残星（第六章起）</text>
      <text class="p">虚线空心环是残星，故意不对称，「不需要」镜像。只补实心四芒星的镜像；把残星也镜像过去，就会多出一处偏差。</text>
      <text class="p dim">空心环与实心星形状不同，不只靠颜色区分。</text>
    </view>

    <view class="card">
      <text class="h">旋转对称（第八章起）</text>
      <text class="p">金色虚线圆环是旋转中心：整张星图绕它顺时针转 90° 后要跟原来一模一样。一个源点会转出三颗，分别在右、下、左，四颗连起来是一个方环。</text>
      <text class="p dim">中心落在格点上时，那一格是死点，不能落星；中心落在格心时没有死点。</text>
    </view>

    <view class="card">
      <text class="h">双镜（第十一章起）</text>
      <text class="p">两道斜镜交叉成 X：先按 ╱ 翻一次、再按 ╲ 翻一次，第三种像是绕两轴交点转 180°。一个源点要补三颗，散落在四个角区里。</text>
      <text class="p dim">两轴的交点是死点，不能落星；只有可交换的两条轴才成立，所以双镜只出现在斜轴 × 斜轴这一类。</text>
    </view>

    <view class="card">
      <text class="h">星芒（第十五章起）</text>
      <text class="p">旋转中心 + 过中心的镜轴，合成 8 阶对称群：一个源点补七颗——先绕中心转出 90°/180°/270° 三颗，再把这四颗各自照镜子。</text>
      <text class="p dim">镜轴整条都是死格，圆心也落在轴上；先在环上数清位置，再落子。</text>
    </view>

    <view class="card">
      <text class="h">星阵（第十六章起）</text>
      <text class="p">不是翻转而是复制：每颗源星沿向量 (vx, vy) 平移，复制出第 1 颗、第 2 颗……最多三步。棋盘上那条虚线箭头就是复制方向。</text>
      <text class="p dim">复制不能越板边：靠边的星只能朝板内方向放源点；步数写在标题栏「×N」里。</text>
    </view>

    <view class="card">
      <text class="h">限次与盲判（第十三章起）</text>
      <text class="p">从第 13 章开始提交次数只剩 2–3 次，用完即失败；「盲判」关连偏差几处都不告诉你，只回一句「还没对齐」。</text>
      <text class="p dim">别急着提交：先把整张图补完再点提交，一关最多只有两次机会。</text>
    </view>

    <view class="card">
      <text class="h">暗域（第九章起）</text>
      <text class="p">带虚线边框的暗斑是暗域：那里落不下星，点上去会被弹回。暗域永远不参与判定，只负责挡路——把它当成星图上的缺口，绕开数格子。</text>
      <text class="p dim">暗域更密时，先补离中心最近的星，能少走弯路。</text>
    </view>

    <view class="card">
      <text class="h">箭头星（第七章起）</text>
      <text class="p">星点上带箭头，位置对齐还不够，方向也要跟着翻折：竖轴「右→左」，横轴「上→下」，斜轴会互换上下左右，旋转关则整体转 90°。</text>
      <text class="p dim">先选方向，再落点；落点会自动带上当前方向。</text>
    </view>

    <view class="card">
      <text class="h">小技巧</text>
      <text class="p">· 从最靠近轴的星开始补，误差最小。</text>
      <text class="p">· 斜轴先把「左右」和「上下」的对应关系在心里过一次。</text>
      <text class="p">· 双轴关按象限成组补，一个源点要补三点，别漏。</text>
      <text class="p">· 旋转关按「右、下、左」三个方向依次数格，比一次想完四个点稳。</text>
    </view>

    <view class="bottom-space" />
  </view>
</template>

<script setup>
const SYMS = [
  { name: '竖轴', formula: '(x, y) → (2a − x, y)', tip: '只翻左右' },
  { name: '横轴', formula: '(x, y) → (x, 2b − y)', tip: '只翻上下' },
  { name: '斜轴 ╱', formula: '(x, y) → (y − c, x + c)', tip: '互换 x/y' },
  { name: '斜轴 ╲', formula: '(x, y) → (c − y, c − x)', tip: '互换并反向' },
  { name: '中心', formula: '(x, y) → (2cx − x, 2cy − y)', tip: '左右上下同时反' },
  { name: '双轴', formula: '竖 + 横的四像', tip: '一个点补三点' },
  { name: '旋转', formula: '(x, y) → (cx − (y − cy), cy + (x − cx))', tip: '绕中心顺时针 90°' },
  { name: '双镜', formula: '╱ 翻 + ╲ 翻的四像', tip: '斜轴 × 斜轴，一源补三' },
  { name: '星芒', formula: '旋转 90° 四像 × 过中心镜轴', tip: '8 阶群，一源补七' },
  { name: '星阵', formula: '(x, y) → (x + kvx, y + kvy)', tip: '平移复制第 k 颗' },
]

function back() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  max-width: 760px;
  margin: 0 auto;
  padding: 0 32rpx;
  box-sizing: border-box;
  background: #070a14;
}
.nav { display: flex; align-items: center; padding: calc(env(safe-area-inset-top) + 16rpx) 0 12rpx; }
.icon-btn {
  width: 72rpx; height: 72rpx; border-radius: 50%;
  background: rgba(124, 107, 224, 0.12); border: 2rpx solid rgba(124, 107, 224, 0.35);
  display: flex; align-items: center; justify-content: center;
}
.icon { font-size: 44rpx; color: #d8d2f6; line-height: 1; margin-top: -6rpx; }
.nav-title { flex: 1; text-align: center; font-size: 32rpx; color: #ece9ff; font-weight: 600; }
.nav-right { width: 72rpx; }

.card {
  margin-top: 20rpx;
  padding: 28rpx;
  border-radius: 20rpx;
  background: rgba(20, 27, 48, 0.68);
  border: 2rpx solid #1d2540;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.h { font-size: 28rpx; color: #e3c07a; font-weight: 600; }
.p { font-size: 25rpx; color: #b9c2d8; line-height: 1.75; }
.p.dim { color: #7d87a3; font-size: 22rpx; }
.step { display: flex; gap: 14rpx; align-items: flex-start; }
.n {
  width: 34rpx; height: 34rpx; line-height: 34rpx; text-align: center;
  border-radius: 50%; background: rgba(124, 107, 224, 0.25);
  color: #d8d2f6; font-size: 20rpx; flex: none; margin-top: 4rpx;
}
.sym-row { display: flex; align-items: baseline; gap: 12rpx; padding: 8rpx 0; border-bottom: 2rpx solid #161d33; }
.sym-name { width: 96rpx; font-size: 24rpx; color: #dfe7ff; flex: none; }
.sym-formula { flex: 1; font-size: 24rpx; color: #a9c4ff; }
.sym-tip { font-size: 20rpx; color: #6e7894; }
.star-line { display: flex; align-items: center; gap: 16rpx; }
.stars { font-size: 26rpx; color: #3a4360; letter-spacing: 2rpx; }
.stars.gold { color: #e3c07a; }
.bottom-space { height: calc(env(safe-area-inset-bottom) + 48rpx); }
</style>
