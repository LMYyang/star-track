// 关卡数据入口：唯一 import JSON 的地方（其余模块保持纯 JS，node 脚本可直接用）
import raw from '../../data/levels.v1.json'
import { hydrateLevels } from './levels.js'

export const STAR = hydrateLevels(raw)
export const LEVELS = STAR.levels
export const LEVEL_MAP = STAR.byId
export const CHAPTERS = STAR.chapters
export const LEVEL_COUNT = LEVELS.length
