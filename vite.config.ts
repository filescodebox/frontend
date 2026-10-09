// neutral 构建:纯公共应用(core 自带入口,默认无宿主适配器)。
// server 仓 release 工作流构建 ghcr.io/pigeonbox/frontend 镜像即用此 flavor;
// 产物不含任何平台代码(CI 有扫描守卫)。
import { defineConfig } from 'vite'
import { coreDir, sharedAlias, sharedDefine, sharedPlugins } from './vite.shared'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  // root 指向 core 包:复用其 index.html/src/main.ts/public(neutral 入口)
  root: coreDir,
  // 相对 base:统一网关等带前缀部署下资源不丢前缀(hash 路由无副作用)
  base: './',
  plugins: sharedPlugins(),
  define: sharedDefine,
  resolve: {
    alias: sharedAlias,
  },
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
  },
})
