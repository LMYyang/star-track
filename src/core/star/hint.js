// 提示：优先指出一个缺失点（M），没有缺点时指出一个多余点（E）。
// 只返回一个点，不泄露全解；调用方负责扣提示次数与绘制脉动光环。
import { judge } from './judge.js'

export function nextHint(level, placed) {
  const r = judge(level.targets, placed)
  if (r.missing.length > 0) {
    return { kind: 'missing', point: r.missing[0].p, text: '这颗星还缺一个镜像' }
  }
  if (r.extra.length > 0) {
    return { kind: 'extra', point: r.extra[0], text: '这颗星没有对应的源点，考虑移除' }
  }
  return null
}
