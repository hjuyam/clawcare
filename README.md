# ClawCare (龙虾管家)

ClawCare 是一个 **Web 运维面板**，目标是让 OpenClaw 对「小白/非技术用户」更 **好用、可控、可回滚**。

- **不负责安装 OpenClaw**：默认假设 OpenClaw 已安装并可访问
- **默认本地打开**：`localhost` 是默认路径；反代自定义域名属于进阶能力
- **核心能力**：高频运维 + 配置/记忆/备份版本管理（带安全护栏与审计）

> 设计原则：**默认安全**（secrets 不落前端；高危操作可控）+ **可回滚**（变更可 diff、可撤销）+ **跨部署一致**（本地/云端/反代一致体验）。

---

## 快速开始（本地启动）

### 依赖
- Node.js（建议 18+ / 20+）
- npm

### 启动
```bash
cd /root/aidev/clawcare
npm install
npm run dev
```

打开：<http://localhost:3000>

### 常用命令
```bash
npm run lint
npm run format
npm run test
npm run build
npm run start
```

---

## 架构概览

### 核心原则：UI 不直连 Gateway
为避免把执行引擎/Token 暴露到浏览器，**前端 UI 永远不直接访问 OpenClaw Gateway**。

### BFF（Backend-for-Frontend）职责
当前仓库使用 **Next.js Route Handlers（`app/api/*`）作为 BFF 形态**，BFF 负责：
- **鉴权与会话管理**（建议 HttpOnly session cookie；前端不持有 secrets）
- **跨部署路由抽象**（local / remote / proxy，统一对 UI 暴露）
- **脱敏与审计**（诊断包、日志、diff 预览）
- **SSE/WS 中继**（Runs/Tasks 事件流）
- **策略护栏**（高危动作二次确认、RBAC、Safe Mode 等）

> 仓库现状：`/api/health`、`/api/capabilities` 与 `/api/ops/self_check` 为占位/Mock 接口，用于打通 UI→BFF 的基础链路。

---

## 代码结构

> 基于 Next.js App Router。

```text
clawcare/
  app/
    api/
      health/route.ts           # 健康检查
      capabilities/route.ts     # 能力握手（占位）
      ops/
        _utils.ts               # 请求解析/错误返回（含 requestId）
        self_check/route.ts     # 自检（目前为 mock）

    _components/                # 共享 UI 组件（Shell/导航等）
    (pages)/                    # 页面：home/connect/tasks/ops/config/memory/security
    layout.tsx                  # 全局布局
    globals.css                 # 全局样式

  public/                       # 静态资源
  docs/                         # 开发者文档
  package.json
  next.config.mjs
  tsconfig.json
  vitest.config.ts
```

---

## 术语速查（来自 clawcare.md）

- **Gateway**：OpenClaw 的执行与编排入口（不应暴露到公网/浏览器）
- **BFF**：面向 UI 的后端层，承担鉴权、路由抽象、脱敏、审计与中继
- **Capabilities**：兼容性握手（版本、部署类型、支持的能力开关）
- **Runs/Tasks**：对“执行一次任务”的统一抽象（输入参数→run_id→状态/日志/产物）
- **Config Center**：专家区配置编辑（强制备份→diff 预览→应用→可回滚→审计）
- **Memory Center**：记忆浏览/搜索/清理（最小可用优先）
- **Safe Mode**：故障期保命：只读 + 禁外发 + 禁修改配置
- **Diagnostics Bundle**：脱敏后的诊断包，用于排障与支持
