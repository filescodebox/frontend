// neutral 构建:纯公共应用(core 自带入口,默认无宿主适配器)。
// server 仓 release 工作流构建 ghcr.io/pigeonbox/frontend 镜像即用此产物;
// 产物不含任何平台代码(CI 有扫描守卫)。
import { defineConfig } from 'vite'
import { coreDir, sharedAlias, sharedDefine, sharedPlugins } from './vite.shared'
import { fileURLToPath } from 'node:url'

// 后端地址,dev 下所有 API 请求代理到这里(PB_API_TARGET 可覆盖,便于指向本地多实例)
const proxyTarget = {
  target: process.env.PB_API_TARGET || 'http://localhost:12345',
  changeOrigin: true,
}

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
  server: {
    port: 3000,
    proxy: {
      // 所有后端 API 路由统一代理到后端,避免 dev 下 Vite fallback 返回 index.html
      '/share': proxyTarget,
      '/user': proxyTarget,
      '/admin': proxyTarget,
      '/chunk': proxyTarget,
      '/api': proxyTarget,
      '/anonymous': proxyTarget,
      '/download': proxyTarget,
      '/notifies': proxyTarget,
      '/presign': proxyTarget,
      '/setup': proxyTarget,
      '/request': proxyTarget,
      '/preview': proxyTarget,
      '/qrcode': proxyTarget,
      '/openapi.json': proxyTarget,
      '/robots.txt': proxyTarget,
      '/ping': proxyTarget,
      '/version': proxyTarget,
    },
  },
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
  },
})
