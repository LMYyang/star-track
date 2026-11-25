import fs from 'node:fs'

/** 直接读仓库里的关卡数据（测试与校验脚本用同一份真源） */
export const RAW = JSON.parse(
  fs.readFileSync(new URL('../src/data/levels.v2.json', import.meta.url), 'utf8')
)

/** 内存 storage，模拟 uni storage 的 get/set/remove */
export function memStorage(initial = null) {
  let box = initial
  return {
    get: () => box,
    set: (_k, v) => { box = v },
    remove: () => { box = null },
    peek: () => box,
  }
}
