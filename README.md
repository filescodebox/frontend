# frontend · Web 前端

[![CI](https://github.com/filescodebox/frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/filescodebox/frontend/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/filescodebox/frontend)](LICENSE)

FilesCodeBox(文件快递柜)Web 前端:Vue 3 + Vite + Element Plus。自 v0.9.0 起与后端**分离部署**——静态资源与 API 反代由 nginx 镜像承担,作为前后端分离形态的统一对外入口。

> 🗂️ [FilesCodeBox 生态](https://github.com/orgs/filescodebox)成员仓 · 总览与部署见 [装配仓 filescodebox](https://github.com/filescodebox/filescodebox) · [架构图集](https://github.com/filescodebox/filescodebox/blob/main/docs/architecture.md)

## 技术栈

- **框架**: Vue 3(Composition API + script setup)
- **构建工具**: Vite 7
- **UI 组件库**: Element Plus(按需自动引入)
- **状态管理**: Pinia
- **路由**: Vue Router 5
- **国际化**: vue-i18n
- **数据请求**: Axios
- **类型检查**: TypeScript 5.9

## 项目结构

```
src/
├── api/            # API 接口封装(share / user / admin ...)
├── components/     # 通用组件 + 上传组件(upload/)
├── composables/    # 组合式函数
├── router/         # 路由配置
├── stores/         # Pinia 状态
├── styles/         # 全局样式(SCSS)
├── types/          # 手写 TS 类型
├── utils/          # Axios 封装等工具
└── views/          # 页面(home / share / user / admin)
```

## 开发指南

```bash
npm install
npm run dev         # http://localhost:3000
npm run typecheck   # vue-tsc --noEmit
npm run test        # vitest
npm run build       # vue-tsc -b && vite build
```

开发环境下,后端 API 路由统一代理到本地后端(`vite.config.ts`):

- `/share /user /admin /chunk /api /anonymous /download /notifies /presign` → `http://localhost:12345`

API 规范真相源是后端运行时生成的 `/openapi.json`(Swagger UI 见前端 `/#/api-docs` 页);本仓不维护 openapi 快照与生成类型,手写类型见 `src/types/`。

## 分离镜像

发布版镜像 **`ghcr.io/filescodebox/frontend`**(多架构,由 [server](https://github.com/filescodebox/server) 仓 release 工作流随同一 `v*` tag 同步发布):

- 基于 `nginx-unprivileged`:静态资源 + 反代 `BACKEND_HOST:BACKEND_PORT`(envsubst 注入,默认后端服务名 `filecodebox:12345`)
- 承接全部对外流量:静态 + `/share /user /admin ...` 反代到后端 API

本地试跑:

```bash
docker build -t fcb-frontend .
docker run -p 8080:8080 -e BACKEND_HOST=host.docker.internal -e BACKEND_PORT=12345 fcb-frontend
```

自托管编排(compose / Helm / Ingress 示例)见 hub 仓 [docs/DEPLOY-COMPOSE.md](https://github.com/filescodebox/filescodebox/blob/main/docs/DEPLOY-COMPOSE.md) 与 [charts](https://github.com/filescodebox/charts)。

## 主要功能

- 📤 **文件分享**:拖拽上传、分片/断点续传、进度显示、过期时间、密码保护
- 📝 **文本分享**:大文本、格式保留
- 📥 **获取分享**:分享码取件、密码验证、下载/复制
- 👤 **用户系统**:注册/登录、我的分享、API 令牌管理
- 🛠 **管理后台**:仪表盘、分享/文件管理、用户管理、站点配置(存库持久化)

## 代码规范

- Composition API + `<script setup>` + TypeScript
- 组件命名 PascalCase,文件命名 kebab-case
- 样式 SCSS + scoped

## License

[Apache-2.0](LICENSE)
