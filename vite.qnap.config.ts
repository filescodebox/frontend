// QNAP flavor 构建:壳入口(注入 QNAP 宿主适配器)+ core 应用。
// 产物供 qnap 仓 QPKG 打包(scripts/build-native.sh → npx vite build --config vite.qnap.config.ts)。
// 与 fnos flavor(vite.fnos.config.ts)同构平行,差异仅在注入的适配器与入口文件。
import { defineConfig, Plugin } from 'vite'
import { coreDir, sharedAlias, sharedDefine, sharedPlugins } from './vite.shared'
import { fileURLToPath } from 'node:url'
import { renameSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 产物收口:入口是 index.qnap.html(避免与 fnos flavor 共用壳入口 index.html),
 * 落盘后重命名为 index.html——部署面(/)语义与 neutral/fnos flavor 一致。
 * (generateBundle 改 bundle key 不被 rollup 认账,落盘 rename 最稳;
 *  outDir 从 configResolved 捕获——CLI --outDir 覆盖时仍指向真实产物目录)
 */
function qnapEntryRename(): Plugin {
  let outDir = ''
  return {
    name: 'qnap-entry-rename',
    configResolved(resolved) {
      outDir = resolved.build.outDir
    },
    closeBundle() {
      const from = join(outDir, 'index.qnap.html')
      const to = join(outDir, 'index.html')
      if (existsSync(from)) {
        renameSync(from, to)
      }
    },
  }
}

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [...sharedPlugins(), qnapEntryRename()],
  define: sharedDefine,
  resolve: {
    alias: sharedAlias,
  },
  // 静态资源(favicon/theme-init)单一真相源=core public
  publicDir: `${coreDir}/public`,
  optimizeDeps: {
    // core 以源码形态参与构建,禁预打包
    exclude: ['@pigeonbox/frontend-core'],
  },
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
    rollupOptions: {
      input: fileURLToPath(new URL('./index.qnap.html', import.meta.url)),
    },
  },
})
