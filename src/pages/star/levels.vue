<template>
  <view class="page">
    <view class="nav">
      <view class="icon-btn" @tap="back"><text class="icon">‹</text></view>
      <view class="nav-title">
        <text class="t">星图册</text>
        <text class="s">{{ progress.cleared }} / {{ LEVEL_COUNT }} 关通关 · {{ progress.totalStars }} ★</text>
      </view>
      <view class="nav-right" />
    </view>

    <view class="chapters">
      <view v-for="c in chapters" :key="c.no" class="chapter">
        <view class="ch-head">
          <view class="ch-left">
            <text class="ch-no">第 {{ c.no }} 章</text>
            <text class="ch-name">{{ c.name }}</text>
            <text class="ch-tag">{{ c.tag }}</text>
          </view>
          <text class="ch-stars">{{ chapterStarsOf(c) }} / {{ c.levels.length * 3 }} ★</text>
        </view>
        <text class="ch-desc">{{ c.desc }}</text>

        <view class="grid">
          <view
            v-for="l in c.levels"
            :key="l.id"
            class="cell"
            :class="{ locked: !unlockedOf(l.id), done: starsOf(l.id) > 0, current: l.id === nextId }"
            @tap="enter(l)"
          >
            <text class="cell-id">{{ l.id }}</text>
            <text class="cell-name">{{ l.name }}</text>
            <view class="cell-stars">
              <text v-for="i in 3" :key="i" :class="{ lit: i <= starsOf(l.id) }">★</text>
            </view>
            <text v-if="!unlockedOf(l.id)" class="lock">锁</text>
            <text v-else-if="tagOf(l)" class="cell-tag" :class="'tag-' + tagClassOf(l)">{{ tagOf(l) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-space" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { CHAPTERS, LEVEL_COUNT } from '../../core/star/levelData.js'
import { loadProgress, emptyProgress, isUnlocked, starOf, chapterStars } from '../../core/star/progress.js'

const progress = ref(emptyProgress())
onShow(() => {
  progress.value = loadProgress()
})

const chapters = CHAPTERS
const nextId = computed(() => Math.min(progress.value.cleared + 1, LEVEL_COUNT))
const unlockedOf = (id) => isUnlocked(progress.value, id)
const starsOf = (id) => starOf(progress.value, id)
const chapterStarsOf = (c) => chapterStars(progress.value, c.levels)

/** 关卡角标：矢=箭头 残=残星 障=暗域 旋=旋转 综=多机制叠加 */
function tagOf(l) {
  if (l.arrows) return '矢'
  if (l.strays.length && l.blockedList.length) return '综'
  if (l.blockedList.length) return '障'
  if (l.strays.length) return '残'
  if (l.sym.type === 'r') return '旋'
  return ''
}
function tagClassOf(l) {
  if (l.arrows) return 'arrow'
  if (l.strays.length && l.blockedList.length) return 'mix'
  if (l.blockedList.length) return 'block'
  if (l.strays.length) return 'stray'
  if (l.sym.type === 'r') return 'rot'
  return ''
}

function enter(l) {
  if (!isUnlocked(progress.value, l.id)) {
    uni.showToast({ title: '通过上一关解锁', icon: 'none' })
    return
  }
  uni.navigateTo({ url: `/pages/star/game?id=${l.id}` })
}

function back() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  max-width: 760px;
  margin: 0 auto;
  padding: 0 28rpx;
  box-sizing: border-box;
  background: radial-gradient(circle at 30% 0%, rgba(84, 106, 190, 0.18), transparent 45%), #070a14;
}
.nav {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: calc(env(safe-area-inset-top) + 16rpx) 0 16rpx;
}
.icon-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(124, 107, 224, 0.12);
  border: 2rpx solid rgba(124, 107, 224, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon { font-size: 44rpx; color: #d8d2f6; line-height: 1; margin-top: -6rpx; }
.nav-title { flex: 1; display: flex; flex-direction: column; gap: 2rpx; }
.t { font-size: 34rpx; color: #ece9ff; font-weight: 600; }
.s { font-size: 22rpx; color: #7d87a3; }
.nav-right { width: 72rpx; }

.chapter { margin-top: 28rpx; }
.ch-head { display: flex; align-items: baseline; gap: 12rpx; }
.ch-left { display: flex; align-items: baseline; gap: 12rpx; flex: 1; }
.ch-no { font-size: 22rpx; color: #7c6be0; }
.ch-name { font-size: 32rpx; color: #efeaff; font-weight: 600; }
.ch-tag {
  font-size: 20rpx;
  color: #8b95b0;
  border: 2rpx solid #26304a;
  border-radius: 999rpx;
  padding: 2rpx 12rpx;
}
.ch-stars { font-size: 22rpx; color: #e3c07a; }
.ch-desc { font-size: 20rpx; color: #5f6884; margin-top: 6rpx; }

.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-top: 18rpx;
}
.cell {
  width: calc(20% - 16rpx);
  aspect-ratio: 1 / 1;
  border-radius: 16rpx;
  background: rgba(20, 27, 48, 0.7);
  border: 2rpx solid #1d2540;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
  position: relative;
}
.cell.done { border-color: rgba(227, 192, 122, 0.45); background: rgba(48, 40, 22, 0.45); }
.cell.current { border-color: #7c6be0; box-shadow: 0 0 18rpx rgba(124, 107, 224, 0.35); }
.cell.locked { opacity: 0.42; }
.cell-id { font-size: 26rpx; color: #dfe7ff; font-weight: 600; }
.cell-name { font-size: 18rpx; color: #8b95b0; }
.cell-stars { display: flex; gap: 2rpx; margin-top: 2rpx; }
.cell-stars text { font-size: 16rpx; color: #313a56; }
.cell-stars text.lit { color: #e3c07a; }
.lock, .cell-tag {
  position: absolute;
  right: 6rpx;
  top: 6rpx;
  font-size: 16rpx;
  color: #5f6884;
  background: rgba(10, 16, 32, 0.85);
  border-radius: 8rpx;
  padding: 0 6rpx;
}
.tag-arrow { color: #a9c4ff; }
.tag-stray { color: #8c9ec4; }
.tag-block { color: #b48ce0; }
.tag-rot { color: #e3c07a; }
.tag-mix { color: #7fe0c8; }
.bottom-space { height: calc(env(safe-area-inset-bottom) + 40rpx); }
</style>
