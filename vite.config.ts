import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Intlify from '@intlify/unplugin-vue-i18n/vite'
import { resolve } from 'path'

// 后端地址，dev 下所有 API 请求代理到这里
const proxyTarget = {
  target: 'http://localhost:12345',
  changeOrigin: true,
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // vue-i18n 构建期预编译语言包:运行时不再用 new Function 编译消息,
    // 兼容严格 CSP(script-src 无 unsafe-eval,见 215 openresty 部署教训)
    Intlify({
      // 相对项目根:本地与 Docker(WORKDIR=/src 即代码根)均成立;
      // 绝对 __dirname 拼接在 Docker 下会变成 /src/src/... 匹配失败→静默跳过预编译
      include: ['src/i18n/locales/**'],
    }),
    // Element Plus 按需引入：模板组件自动注册 + 样式按组件引入（程序化 API
    // 与 v-loading 的样式/指令在 main.ts 手动接入，见 element-plus-services.ts）
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts',
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      // 所有后端 API 路由统一代理到后端，避免 dev 下 Vite fallback 返回 index.html
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
      '/ping': proxyTarget,
    },
  },
})
