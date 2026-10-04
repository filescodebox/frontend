import { describe, it, expect } from 'vitest'
import { resolveAccent, ACCENT_CACHE_KEY } from '../accent'

// 公式基准：与 main.scss 预填色阶、index.html 首帧引导三处一致。
// 改公式必须三处同步（历史教训：手算色阶漂移）。
describe('resolveAccent', () => {
  const V = (raw: string, dark: boolean) => resolveAccent(raw, dark)!.vars

  it('浅色：主色原值，light-N 向白混，dark-2 向黑混', () => {
    const v = V('#7c3aed', false)
    expect(v['--el-color-primary']).toBe('rgb(124, 58, 237)')
    expect(v['--el-color-primary-light-3']).toBe('rgb(163, 117, 242)')
    expect(v['--el-color-primary-light-5']).toBe('rgb(190, 157, 246)')
    expect(v['--el-color-primary-light-7']).toBe('rgb(216, 196, 250)')
    expect(v['--el-color-primary-light-8']).toBe('rgb(229, 216, 251)')
    expect(v['--el-color-primary-light-9']).toBe('rgb(239, 231, 253)')
    expect(v['--el-color-primary-dark-2']).toBe('rgb(99, 46, 190)')
    expect(v['--primary-color']).toBe('rgb(124, 58, 237)')
    expect(v['--primary-hover']).toBe('rgb(148, 93, 240)')
    expect(v['--primary-active']).toBe('rgb(87, 41, 166)')
    expect(v['--primary-bg']).toBe('rgb(242, 235, 253)')
    expect(v['--primary-color-rgb']).toBe('124, 58, 237')
    expect(v['--primary-gradient']).toBe(
      'linear-gradient(135deg, rgb(124, 58, 237) 0%, rgb(124, 58, 237) 100%)'
    )
  })

  it('深色：主色提亮 30%，light-N 向 #0a0a0a 混，dark-2 向白混', () => {
    const v = V('#7c3aed', true)
    expect(v['--el-color-primary']).toBe('rgb(163, 117, 242)')
    expect(v['--el-color-primary-light-3']).toBe('rgb(117, 85, 172)')
    expect(v['--el-color-primary-light-5']).toBe('rgb(87, 64, 126)')
    expect(v['--el-color-primary-light-7']).toBe('rgb(56, 42, 80)')
    expect(v['--el-color-primary-light-8']).toBe('rgb(41, 31, 56)')
    expect(v['--el-color-primary-light-9']).toBe('rgb(28, 23, 38)')
    expect(v['--el-color-primary-dark-2']).toBe('rgb(181, 145, 245)')
    expect(v['--primary-color']).toBe('rgb(163, 117, 242)')
    expect(v['--primary-hover']).toBe('rgb(135, 98, 200)')
    expect(v['--primary-active']).toBe('rgb(191, 158, 246)')
    expect(v['--primary-bg']).toBe('rgba(163, 117, 242, 0.14)')
    expect(v['--primary-color-rgb']).toBe('163, 117, 242')
  })

  it('3 位 hex 规范化为 6 位', () => {
    const r = resolveAccent('#abc', false)!
    expect(r.hex).toBe('#aabbcc')
    expect(r.vars['--el-color-primary']).toBe('rgb(170, 187, 204)')
  })

  it('无效输入返回 null（含注入向量）', () => {
    for (const bad of ['', null, undefined, 'javascript:alert(1)', '#12345', 'red', '#gggggg', 'url(http://x)']) {
      expect(resolveAccent(bad as string, false)).toBeNull()
    }
  })

  it('输出恰好覆盖 13 个主题变量', () => {
    const v = V('#7c3aed', false)
    expect(Object.keys(v).length).toBe(13)
    expect(v[ACCENT_CACHE_KEY as never]).toBeUndefined()
  })
})
