<template>
  <view v-if="visible" class="mask">
    <view class="sheet">
      <text class="title" :class="{ fail: !pass }">{{ pass ? '星轨对齐' : '星轨错位' }}</text>
      <text class="sub" v-if="pass">
        第 {{ levelId }} 关通过 · {{ starText }}
      </text>
      <text class="sub" v-else-if="exhausted">提交次数用尽 · 星图崩解</text>
      <text class="sub" v-else-if="showMismatch">偏差 {{ deviations }} 处 · 再观察一次</text>
      <text class="sub" v-else>还差一些 · 再观察一次</text>

      <view v-if="pass" class="star-row">
        <text v-for="i in 3" :key="i" class="big" :class="{ lit: i <= star }">★</text>
      </view>

      <view class="btns">
        <view v-if="pass && nextId" class="btn-main" @tap="$emit('next')">下一关 →</view>
        <view v-else-if="!pass" class="btn-main" @tap="$emit('retry')">重新观测</view>
        <view class="btn-plain" @tap="$emit('home')">返回星图册</view>
      </view>

      <text v-if="pass && nextId" class="hint-line">下一关：第 {{ nextId }} 关</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  visible: { type: Boolean, default: false },
  pass: { type: Boolean, default: false },
  star: { type: Number, default: 0 },
  deviations: { type: Number, default: 0 },
  showMismatch: { type: Boolean, default: true },
  exhausted: { type: Boolean, default: false },
  levelId: { type: Number, default: 1 },
  nextId: { type: Number, default: 0 },
})
defineEmits(['retry', 'next', 'home'])

const STAR_TEXT = { 3: '三星归位', 2: '二星可鉴', 1: '一星通过' }
const starText = computed(() => STAR_TEXT[props.star] || '通过')
</script>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(4, 7, 15, 0.72);
  backdrop-filter: blur(6rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99;
}
.sheet {
  width: 620rpx;
  padding: 44rpx 40rpx 36rpx;
  border-radius: 28rpx;
  background: linear-gradient(180deg, rgba(24, 32, 58, 0.98), rgba(14, 19, 34, 0.98));
  border: 2rpx solid #2b3559;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.title { font-size: 44rpx; font-weight: 700; color: #efeaff; letter-spacing: 2rpx; }
.title.fail { color: #a9b6d6; }
.sub { font-size: 24rpx; color: #7d87a3; }
.star-row { display: flex; gap: 16rpx; margin: 8rpx 0; }
.big { font-size: 56rpx; color: #3a4360; }
.big.lit { color: #e3c07a; text-shadow: 0 0 22rpx rgba(227, 192, 122, 0.65); }
.btns { display: flex; flex-direction: column; gap: 16rpx; width: 100%; margin-top: 12rpx; }
.btn-main {
  height: 88rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #7c6be0, #5646b8);
  color: #fff;
  font-size: 30rpx;
  box-shadow: 0 8rpx 20rpx rgba(76, 60, 160, 0.4);
}
.btn-plain {
  height: 76rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9aa3bb;
  font-size: 26rpx;
  border: 2rpx solid #26304a;
}
.hint-line { font-size: 20rpx; color: #5f6884; }
</style>
