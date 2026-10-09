# frontend · PigeonBox 前端壳(frontend shell)

[![CI](https://github.com/pigeonbox/frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/pigeonbox/frontend/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/pigeonbox/frontend)](LICENSE)

PigeonBox Web 前端的**壳仓**:仅构建 **neutral 产物**(零平台代码),供 server 仓
release 发布的 [`ghcr.io/pigeonbox/frontend`](https://github.com/pigeonbox/frontend)
nginx 静态镜像使用。公共应用全量(视图/stores/API/i18n/组件/单测)在
[frontend-core](https://github.com/pigeonbox/frontend-core),以 Release 源码 tgz
消费(`@pigeonbox/frontend-core`,与 `@pigeonbox/contracts` 同模式)。

## 构建

```bash
npm ci
npm run build       # neutral 产物:core 自带入口,零平台代码(server/docker 镜像用)
npm run typecheck   # 壳 + core 源码类型检查
npm run dev         # 开发服务器(API 代理 → localhost:12345,PB_API_TARGET 可覆盖)
```

## 结构

```
src/
└─ vite-env.d.ts        # __APP_VERSION__ 构建注入声明
vite.config.ts          # neutral 构建(root=core 包;dev 含 API 代理)
vite.shared.ts          # 构建共享片段(别名/插件/define)
```

> **平台适配器归各平台仓**(2026-10-09 前端拆仓):fnOS 适配器在
> [fnos 仓 `web/`](https://github.com/pigeonbox/fnos)、QNAP(QTS)适配器在
> [qnap 仓 `web/`](https://github.com/pigeonbox/qnap),各自自包含构建
> (消费 frontend-core tgz),本仓只保留 neutral 镜像构建。

- `@` → core 源码(tgz 内),`@shell` → 壳自身代码
- 运行时依赖(element-plus/axios 等)全部经 core 精确钉版传递解析,壳不自带
- 新增平台:在平台仓建 `web/`(壳入口 `installHost(适配器)` + vite 构建,参考
  fnos/qnap 两仓的 `web/` 目录),core 与本仓零改动

License: Apache-2.0 · Copyright 2026 PigeonBox
