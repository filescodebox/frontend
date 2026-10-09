// fnOS flavor 构建:壳入口(注入 fnOS 宿主适配器)+ core 应用。
// 产物供 fnos 仓 fpk 打包(scripts/build-native.sh → npm run build:fnos)。
import { defineConfig } from 'vite'
import { coreDir, coreSrc, sharedAlias, sharedDefine, sharedPlugins } from './vite.shared'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: sharedPlugins(),
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
  },
})
