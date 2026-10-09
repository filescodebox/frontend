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
npm run typecheck   # 壳 + core 源码类型检查
npm run dev         # fnos flavor 开发服务器
```

## 结构

```
src/
├─ main.qnap.ts         # qnap flavor 入口:installHost(qnap 适配器) → 拉起 core
├─ host/impl/qnap/      # QNAP(QTS)宿主适配器(SSO/系统信息;文件动作等桥接能力缺席)
└─ vite-env.d.ts        # __APP_VERSION__ 构建注入声明
vite.config.ts          # neutral flavor(root=core 包,server/docker 镜像产物)
vite.qnap.config.ts     # qnap flavor(壳入口)
vite.shared.ts          # flavor 共享片段(别名/插件/define)
```

> **fnOS 适配器已迁 [fnos 仓 `web/`](https://github.com/pigeonbox/fnos)**(2026-10-09 适配器归平台仓:
> fpk/镜像 web 产物自该仓自包含构建)。qnap 适配器按同模式将迁 qnap 仓,本仓长期保留
> neutral 镜像构建(ghcr.io/pigeonbox/frontend)。

- `@` → core 源码(tgz 内),`@shell` → 壳自身代码
- 运行时依赖(element-plus/axios 等)全部经 core 精确钉版传递解析,壳不自带
- 新增平台(qnap/synology/ugreen/…)在本仓加 `src/host/impl/<platform>/` + 对应
  flavor 配置,core 零改动

License: Apache-2.0 · Copyright 2026 PigeonBox
