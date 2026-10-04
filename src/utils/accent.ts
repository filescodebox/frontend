/**
 * 主题色（accent）统一应用。
 *
 * accent 来自 /api/config（ui.accent_color，管理后台可配，后端已做 #hex 白名单校验）。
 * 必须同时覆盖 Element Plus 变量与 main.scss 的 --primary-* 家族：只改前者会出现
 * EP 组件（按钮/菜单/分页）与自定义元素（链接/聚焦环/hover 浅底）两种主色并存。
 * 色阶按当前深浅模式分别向黑/白混合；深色下主色整体提亮以满足 #0a0a0a 底的
 * 对比度（≥4.5:1）。accent 为空时清除全部内联变量，回归 main.scss 设计色。
 */

interface Rgb {
  r: number
  g: number
  b: number
}

const ACCENT_PROPS = [
  '--el-color-primary',
  '--el-color-primary-light-3',
  '--el-color-primary-light-5',
  '--el-color-primary-light-7',
  '--el-color-primary-light-8',
  '--el-color-primary-light-9',
  '--el-color-primary-dark-2',
  '--primary-color',
  '--primary-hover',
  '--primary-active',
  '--primary-bg',
  '--primary-color-rgb',
  '--primary-gradient',
]

/** 已生效 accent 的缓存键：index.html 首帧引导读取，避免配置返回前主色跳变 */
export const ACCENT_CACHE_KEY = 'app_accent'

const WHITE: Rgb = { r: 255, g: 255, b: 255 }
// 深色混合目标贴近 --color-bg(#0a0a0a) 而非纯黑，色阶过渡更顺
const DARK_BASE: Rgb = { r: 10, g: 10, b: 10 }

function parseHex(raw: string): Rgb | null {
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(raw.trim())
  if (!m || !m[1]) return null
  let h = m[1]
  if (h.length === 3) h = h
    .split('')
    .map((c) => c + c)
    .join('')
  const n = parseInt(h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

const mix = (c: Rgb, t: Rgb, ratio: number): Rgb => ({
  r: Math.round(c.r + (t.r - c.r) * ratio),
  g: Math.round(c.g + (t.g - c.g) * ratio),
  b: Math.round(c.b + (t.b - c.b) * ratio),
})

const lighten = (c: Rgb, ratio: number): Rgb => mix(c, WHITE, ratio)

const rgb = (c: Rgb): string => `rgb(${c.r}, ${c.g}, ${c.b})`

export function applyAccent(raw?: string | null): void {
  const root = document.documentElement
  const accent = parseHex(raw || '')
  if (!accent) {
    for (const p of ACCENT_PROPS) root.style.removeProperty(p)
    try { localStorage.removeItem(ACCENT_CACHE_KEY) } catch { /* noop */ }
    return
  }
  try {
    // 规范化为 6 位 hex：index.html 的首帧引导只按 6 位解析
    const norm = '#' + [accent.r, accent.g, accent.b]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
    localStorage.setItem(ACCENT_CACHE_KEY, norm)
  } catch { /* noop */ }

  const dark = root.classList.contains('dark')
  // 深色下主色提亮（与 main.scss html.dark 同公式），保证 #0a0a0a 底对比度
  const base = dark ? lighten(accent, 0.3) : accent
  const toward = dark ? DARK_BASE : WHITE
  const set = (p: string, v: string) => root.style.setProperty(p, v)

  // Element Plus：light-N 用于浅底/边框/hover，dark-2 用于 active
  set('--el-color-primary', rgb(base))
  set('--el-color-primary-light-3', rgb(mix(base, toward, 0.3)))
  set('--el-color-primary-light-5', rgb(mix(base, toward, 0.5)))
  set('--el-color-primary-light-7', rgb(mix(base, toward, 0.7)))
  set('--el-color-primary-light-8', rgb(mix(base, toward, 0.8)))
  set('--el-color-primary-light-9', rgb(mix(base, toward, 0.88)))
  set('--el-color-primary-dark-2', rgb(mix(base, dark ? WHITE : { r: 0, g: 0, b: 0 }, 0.2)))

  // main.scss 的 --primary-* 家族（链接/聚焦环/hover 浅底/tag 底色）
  set('--primary-color', rgb(base))
  set('--primary-hover', rgb(mix(base, toward, 0.18)))
  set('--primary-active', rgb(mix(base, dark ? WHITE : { r: 0, g: 0, b: 0 }, 0.3)))
  set('--primary-bg', dark ? `rgba(${base.r}, ${base.g}, ${base.b}, 0.14)` : rgb(mix(base, WHITE, 0.9)))
  set('--primary-color-rgb', `${base.r}, ${base.g}, ${base.b}`)
  set('--primary-gradient', `linear-gradient(135deg, ${rgb(base)} 0%, ${rgb(base)} 100%)`)
}
