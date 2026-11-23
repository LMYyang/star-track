<template>
  <view v-if="visible" class="guide-mask">
    <view class="guide">
      <text class="g-title">{{ title }}</text>
      <text v-for="(l, i) in lines" :key="i" class="g-line">{{ l }}</text>
      <view class="g-btn" @tap="$emit('close')">知道了</view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  lines: { type: Array, default: () => [] },
})
defineEmits(['close'])
</script>

<style scoped>
.guide-mask {
  position: fixed;
  inset: 0;
  background: rgba(4, 7, 15, 0.66);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 98;
}
.guide {
  width: 600rpx;
  padding: 40rpx 36rpx 32rpx;
  border-radius: 24rpx;
  background: rgba(20, 27, 48, 0.97);
  border: 2rpx solid #2b3559;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}
.g-title { font-size: 32rpx; color: #e3c07a; font-weight: 600; }
.g-line { font-size: 26rpx; color: #b9c2d8; line-height: 1.7; }
.g-btn {
  margin-top: 12rpx;
  height: 76rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(124, 107, 224, 0.22);
  border: 2rpx solid rgba(124, 107, 224, 0.55);
  color: #d8d2f6;
  font-size: 26rpx;
}
</style>
