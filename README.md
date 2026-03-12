# ClawCare（龙虾管家）

ClawCare 是一个 **Web 运维面板（OpenClaw Control Plane UI）**：为 OpenClaw 提供「**安全可控**、**可审计**、**可回滚**」的日常运维体验。

> 定位一句话：把 OpenClaw 的“执行引擎”包在一个 **默认安全** 的 BFF 之后，用 UI 把高频运维、Runs/Tasks、配置版本管理做成 **可验收的闭环**。

## 必须先读（5 分钟）

- **安全模型与验收口径（M1）**：[`SECURITY.md`](./SECURITY.md) + [`docs/acceptance-m1-security.md`](./docs/acceptance-m1-security.md)
- **当前里程碑状态（M1/M2/M3/M4）**：[`docs/STATUS.md`](./docs/STATUS.md)
-（想对齐 PM/路线图）[`docs/PROGRESS_2026-03-12.md`](./docs/PROGRESS_2026-03-12.md)

---

## 项目是什么（What / Why）

ClawCare 解决三个核心问题：

1) **默认安全**：浏览器不拿 OpenClaw Gateway 的 token/secrets；所有鉴权、RBAC、Safe Mode、脱敏、审计都在 **BFF（服务端）** 完成。

2) **可回滚**：配置变更有版本、有 diff 预览、有 apply/rollback 的“保险丝”（confirm gate），且全程可审计。

3) **可追踪**：所有“做过什么”都有 Runs/Tasks 记录（run_id、状态、输入输出、错误、产物路径）。

> 重要边界：**本仓库不负责安装 OpenClaw**；默认假设 Gateway 已安装并可访问（ClawCare 负责“安全地控制它”）。

---

## 当前已实现（M1/M2/M3）与已知限制

以 `main` 分支为准（更完整的状态见 [`docs/STATUS.md`](./docs/STATUS.md)）。

### M1（安全基线）✅
- Auth/Session（`/login` + `/api/auth/login/logout`）
- RBAC（最小：`admin` / `viewer`）
- Safe Mode：故障期“只读 + 禁改配置/高危动作”
- Policy deny + 审计（best-effort 追加写 `data/audit/events.jsonl`）
- 单测 + E2E 合约测试（M1 口径）

### M2（Runs/Tasks 最小闭环）✅（v0 可上线口径）
- Runs API：创建 / 列表 / 详情
- Runs UI：`/tasks` 列表 + `/tasks/[id]` 详情（轮询刷新）
- 文件持久化（best-effort）：`data/runs.json`
- mock executor：把 queued → running → succeeded 跑通（best-effort timer）
- Diagnostics bundle（mock artifact 写入 `data/artifacts/` 并回传路径）

### M3（Config Center）⚠️ 进行中（已有雏形）
- API：`/api/config/current|versions|preview_diff|apply|rollback`
- UI：`/config`（Draft JSON / Preview diff / Apply / Rollback）
- 受 RBAC + Safe Mode 约束，`apply/rollback` 有 confirm gate

### 已知限制（请务必明确给验收/用户）
- **Runs 目前主要是“可追踪闭环”，不是“真实执行引擎”**：executor 是 mock timer；创建 `ops.*`/`config.*` run **不会真正执行** Gateway/系统级动作（除非后续里程碑补齐 handler）。
- **存储为文件 best-effort**：`data/*.json` / `*.jsonl` 以简单落盘为主，并发/多实例/Serverless 环境下不保证强一致。
- **M3 apply/rollback 目前偏“排队入口”**：已具备预览/版本列表/按钮与策略护栏，但“真实落盘推进版本/回滚”的语义仍在补齐中（详见 Roadmap）。

---

## 快速开始（开发者）

### 依赖
- Node.js 18+ / 20+
- npm

### 安装与启动
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
npm run test       # vitest
npm run test:e2e   # playwright
npm run build
npm run start
```

> 说明：E2E 目前以 M1 安全合约为主；Runs/Config 的 E2E 覆盖在规划中。

---

## 架构概览（BFF-first）

### 核心原则：UI 不直连 Gateway
为避免把执行引擎/Token 暴露到浏览器，**前端 UI 永远不直接访问 OpenClaw Gateway**。

### BFF（Backend-for-Frontend）职责
本仓库用 **Next.js Route Handlers（`app/api/*`）作为 BFF**，主要负责：
- 鉴权与会话管理（建议 HttpOnly session cookie；前端不持有 secrets）
- RBAC 与 Safe Mode（策略护栏）
- 统一错误返回（带 requestId）
- 脱敏与审计（deny/allow 都尽量入审计，best-effort）
- Runs/Tasks 事件中继（当前以轮询/文件为主，SSE/WS 为后续）

代码结构（简化）：
```text
clawcare/
  app/
    api/                  # BFF APIs
    (pages)/              # /tasks /ops /config /memory /security ...
  data/                   # 本地落盘（runs/audit/config snapshots/artifacts）
  docs/
  tests/
```

---

## 安全模型（Auth / RBAC / Safe Mode）

> 这一段建议结合 `docs/acceptance-m1-security.md` 一起看。

### Auth / Session
- 目标：**浏览器侧不保存长期 secrets**；会话使用 HttpOnly cookie。
- 本地演示可能存在 DEV_BYPASS（仅允许 localhost + dev mode），用于快速联调（见验收说明）。

### RBAC
- 最小角色：`admin` / `viewer`
- 原则：UI 侧隐藏/禁用只是体验；**最终必须由 BFF 在服务端强制**。

### Safe Mode
Safe Mode 用于故障止血：
- 允许只读查询（health/config current/audit list 等）
- 禁止任何有副作用的动作（apply/rollback、cleanup/restart、外发/外联等）

---

## Runs / Tasks：基本用法

### UI 路径
- 创建 run（示例入口）：`/ops`（Create Run 卡片）
- 查看 runs 列表：`/tasks`
- 查看 run 详情：`/tasks/[id]`

### API 示例（curl）
> 注：若启用了登录，会话 cookie 需由浏览器登录后带上；以下仅演示接口形态。

创建一个 run：
```bash
curl -X POST 'http://localhost:3000/api/runs' \
  -H 'content-type: application/json' \
  -d '{
    "type": "ops.self_check",
    "reason": "demo",
    "input": {"scope": "local"}
  }'
```

获取列表：
```bash
curl 'http://localhost:3000/api/runs?limit=50'
```

获取详情：
```bash
curl 'http://localhost:3000/api/runs/<run_id>'
```

你可以在 run 详情中看到：
- `status`：queued/running/succeeded/failed
- `requested_by`：操作者信息（best-effort）
- `input/result/error`：输入输出与错误
- `artifacts`：产物（如 diagnostics bundle 路径，当前为 mock）

---

## Config Center：基本用法（preview / apply / rollback 合约）

### UI 路径
- 配置中心：`/config`
  - Current：查看当前版本与内容
  - Draft：编辑 JSON（草稿）
  - Preview diff：预览（masked）差异
  - Apply / Rollback：需要 confirm gate，且 **admin-only**，Safe Mode 下禁止

### API 合约（简化版）
读取当前配置：
```bash
curl 'http://localhost:3000/api/config/current'
```

列出历史版本：
```bash
curl 'http://localhost:3000/api/config/versions'
```

预览差异（会对敏感字段做 mask）：
```bash
curl -X POST 'http://localhost:3000/api/config/preview_diff' \
  -H 'content-type: application/json' \
  -d '{
    "base_version": "<current_version>",
    "config": {"example": true}
  }'
```

应用配置（**admin-only**；需要 `confirm=true`；Safe Mode 下拒绝）：
```bash
curl -X POST 'http://localhost:3000/api/config/apply' \
  -H 'content-type: application/json' \
  -d '{
    "base_version": "<current_version>",
    "config": {"example": true},
    "reason": "change for demo",
    "confirm": true
  }'
```

回滚（**admin-only**；需要 `confirm=true`；Safe Mode 下拒绝）：
```bash
curl -X POST 'http://localhost:3000/api/config/rollback' \
  -H 'content-type: application/json' \
  -d '{
    "target_version": "<some_version>",
    "reason": "rollback demo",
    "confirm": true
  }'
```

#### 合约要点（M3 验收口径）
- `preview_diff`：允许 viewer 访问（只读能力），输出 masked diff。
- `apply/rollback`：
  - 必须 `confirm=true`，否则返回 `CONFIRM_REQUIRED`（通常为 409）。
  - 必须 admin 权限。
  - Safe Mode 开启时必须拒绝（403/409 均可，但要返回结构化 error + requestId，并写入审计，best-effort）。
  - 成功时返回 `run_id`（把变更动作纳入 Runs 可追踪链路）。

---

## Roadmap（M3 / M4）

> 更完整定义见 `docs/PM_PLAN_2026-03-12.md`。

### M3（Config Center：可回滚 + 可审计 的完整链路）
目标：不止能“点按钮”，而是把“备份→diff→apply/rollback→审计”做成可证明的闭环。
- [ ] apply/rollback 的**真实落盘语义**：manifest/snapshots 推进与回退（不仅仅是创建 run）
- [ ] E2E 覆盖 `/config` 的 preview/apply/rollback 合约
- [ ] 审计面板最小可用（/security 从占位变可读、可筛选）

### M4（Memory Center）
目标：记忆可见、可搜、可控（删除/保留），并与 RBAC/Safe Mode/Audit 对齐。
- [ ] memory API：list/summary、search、delete（admin-only）、pin（可选）
- [ ] `/memory` UI：近 7 天列表 + 搜索 + pin/delete
- [ ] E2E：viewer 只读；admin 可删除；Safe Mode 禁写

---

## 术语速查
- **Gateway**：OpenClaw 执行/编排入口（不应暴露到公网/浏览器）
- **BFF**：面向 UI 的后端层（鉴权/脱敏/审计/策略护栏/中继）
- **Runs/Tasks**：一次执行的统一抽象（输入参数→run_id→状态/日志/产物）
- **Config Center**：配置版本管理（diff→apply/rollback→审计）
- **Safe Mode**：故障期保命（只读 + 禁外发 + 禁修改）

---

## 相关文档
- 安全与威胁模型：[`SECURITY.md`](./SECURITY.md)
- M1 验收说明：[`docs/acceptance-m1-security.md`](./docs/acceptance-m1-security.md)
- 状态与里程碑：[`docs/STATUS.md`](./docs/STATUS.md)
- 进报与路线图（2026-03-12）：[`docs/PROGRESS_2026-03-12.md`](./docs/PROGRESS_2026-03-12.md)
