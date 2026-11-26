// 关卡数据入口：唯一 import JSON 的地方（其余模块保持纯 JS，node 脚本可直接用）
// v1.2 起使用 levels.v4.json（64 关 + 第 11–14 章 32 关 = 96 关）；v1/v2 文件保留作历史
import raw from '../../data/levels.v4.json'
import { hydrateLevels } from './levels.js'

export const STAR = hydrateLevels(raw)
export const LEVELS = STAR.levels
export const LEVEL_MAP = STAR.byId
export const CHAPTERS = STAR.chapters
export const LEVEL_COUNT = LEVELS.length
