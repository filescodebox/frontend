# frontend · PigeonBox 前端壳(frontend shell)

[![CI](https://github.com/pigeonbox/frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/pigeonbox/frontend/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/pigeonbox/frontend)](LICENSE)

PigeonBox Web 前端的**壳仓**:注入宿主平台适配器、构建多 flavor 产物。
公共应用全量(视图/stores/API/i18n/组件/单测)在 [frontend-core](https://github.com/pigeonbox/frontend-core),
以 Release 源码 tgz 消费(`@pigeonbox/frontend-core`,与 `@pigeonbox/contracts` 同模式)。

## 构建

```bash
npm ci
npm run build       # neutral flavor:core 自带入口,零平台代码(server/docker 镜像用)
npm run build:fnos  # fnos flavor:注入 fnOS 宿主适配器(fpk 打包用)
npm run typecheck   # 壳 + core 源码类型检查
npm run dev         # fnos flavor 开发服务器
```

## 结构

```
src/
├─ main.ts              # fnos flavor 入口:installHost(fnos 适配器) → 拉起 core
├─ host/impl/fnos/      # fnOS 宿主适配器(@trimjs/web-app:SSO/授权目录/文件动作/跟随)
└─ vite-env.d.ts        # __APP_VERSION__ 构建注入声明
vite.config.ts          # neutral flavor(root=core 包)
vite.fnos.config.ts     # fnos flavor(壳入口)
vite.shared.ts          # 双 flavor 共享片段(别名/插件/define)
```

- `@` → core 源码(tgz 内),`@shell` → 壳自身代码
- 运行时依赖(element-plus/axios 等)全部经 core 精确钉版传递解析,壳不自带
- 新增平台(qnap/synology/ugreen/…)在本仓加 `src/host/impl/<platform>/` + 对应
  flavor 配置,core 零改动

License: Apache-2.0 · Copyright 2026 PigeonBox
