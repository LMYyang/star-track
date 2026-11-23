<template>
  <view class="pad">
    <text class="label">箭头方向</text>
    <view class="keys">
      <view
        v-for="d in DIRS"
        :key="d.key"
        class="key"
        :class="{ on: dir === d.key }"
        @tap="$emit('change', d.key)"
      >
        <view class="tri" :style="{ transform: `rotate(${d.angle}deg)` }" />
        <text class="k">{{ d.key }}</text>
      </view>
    </view>
    <text class="tip">落点会自动带上此方向</text>
  </view>
</template>

<script setup>
defineProps({ dir: { type: String, default: 'U' } })
defineEmits(['change'])
const DIRS = [
  { key: 'U', angle: 0 },
  { key: 'R', angle: 90 },
  { key: 'D', angle: 180 },
  { key: 'L', angle: 270 },
]
</script>

<style scoped>
.pad {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 12rpx 28rpx;
}
.label { font-size: 22rpx; color: #7d87a3; }
.keys { display: flex; gap: 12rpx; }
.key {
  width: 76rpx;
  height: 76rpx;
  border-radius: 18rpx;
  background: rgba(124, 107, 224, 0.08);
  border: 2rpx solid #26304a;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
}
.key.on {
  border-color: #7c6be0;
  background: rgba(124, 107, 224, 0.22);
  box-shadow: 0 0 18rpx rgba(124, 107, 224, 0.35);
}
.tri {
  width: 0;
  height: 0;
  border-left: 8rpx solid transparent;
  border-right: 8rpx solid transparent;
  border-bottom: 14rpx solid #a9c4ff;
}
.key.on .tri { border-bottom-color: #efeaff; }
.k { font-size: 18rpx; color: #6e7894; }
.tip { font-size: 20rpx; color: #5f6884; margin-left: auto; }
</style>
