// 生成关卡目标集黄金快照：node scripts/gen-golden.mjs
// 改动关卡数据或对称实现后，先跑校验，再跑这个脚本更新快照，并在提交里复核差异。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { hydrateLevels } from '../src/core/star/levels.js'

const SRC = new URL('../src/data/levels.v2.json', import.meta.url)
const OUT = new URL('../tests/fixtures/level-targets.golden.json', import.meta.url)

const data = JSON.parse(readFileSync(SRC, 'utf8'))
const { levels } = hydrateLevels(data)

const golden = {
  version: data.version || 1,
  count: levels.length,
  levels: levels.map((l) => ({
    id: l.id,
    name: l.name,
    chapter: l.chapter,
    board: l.board,
    sym: l.sym.type,
    arrows: l.arrows,
    targets: [...l.targets.keys()].sort(),
  })),
}

mkdirSync(dirname(OUT.pathname.replace(/^\/([A-Za-z]:)/, '$1')), { recursive: true })
writeFileSync(OUT, JSON.stringify(golden, null, 2) + '\n', 'utf8')
console.log(`✓ 已写入 ${golden.count} 关目标集快照：tests/fixtures/level-targets.golden.json`)
