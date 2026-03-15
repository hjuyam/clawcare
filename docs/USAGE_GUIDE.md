# ClawCare 使用指南（UI + API）

> 面向“想把 ClawCare 跑起来，并在 10 分钟内走通核心闭环”的使用者。
>
> ClawCare 是 OpenClaw 的 **Control Plane UI（运维面板 + BFF）**：
> - 提供：TOTP 登录 + Session、RBAC、Safe Mode、Runs/Tasks 追踪、Config Center（diff/apply/rollback）、Security & Audit、Memory Center。
> - 不负责：安装 OpenClaw Gateway；以及“真实执行引擎”（v0 里 Runs executor 仍为 mock）。

相关文档：
- 环境变量说明：[`docs/ENVIRONMENT.md`](./ENVIRONMENT.md)
- 《边界与注意事项》：[`docs/BOUNDARIES_AND_GOTCHAS.md`](./BOUNDARIES_AND_GOTCHAS.md)
- API 合约摘要：[`docs/api-contract.md`](./api-contract.md)
- 项目状态：[`docs/STATUS.md`](./STATUS.md)

---

## 1) 启动（本地开发）

### 依赖

- Node.js 18+ / 20+
- npm

### 环境配置（可选但推荐）

本地开发建议在项目根目录创建 `.env.local`：

```bash
# .env.local
DEV_BYPASS=1
AUTH_USER_ID=local-admin
AUTH_ROLE=admin
SESSION_SECRET=dev-session-secret
```

> 生产环境务必设置 `SESSION_SECRET`，且不要开启 `DEV_BYPASS`。

### 安装与启动

```bash
cd /root/aidev/clawcare
npm install
npm run dev
```

打开：<http://localhost:3000>

> 生产/部署相关内容不在本文范围；当前更偏本地/单实例开发运行。

### （可选）接入 OpenClaw Gateway

设置以下环境变量即可让 `/api/capabilities` 与 `/api/runs*` 走真实 Gateway：

```bash
CLAWCARE_GATEWAY_BASE_URL=http://127.0.0.1:18789
CLAWCARE_GATEWAY_AUTH_TOKEN=Bearer <token>
```

验证：

```bash
curl 'http://localhost:3000/api/capabilities'
```

> 未配置 Gateway 时，Runs 使用本地 mock executor，仅用于演示闭环。

### （可选）WS Gateway 模式（推荐）

当本机 Gateway 仅提供 WebSocket 控制平面时：

```bash
export CLAWCARE_GATEWAY_MODE=ws
export CLAWCARE_GATEWAY_WS_URL=ws://127.0.0.1:18789
export CLAWCARE_GATEWAY_AUTH_TOKEN=<your-token>
```

验证（示例返回截断）：
```
{"ok":true,"payload":{"jobs":[{"id":"<job-id>","name":"..."}]}}
```
```
{"ok":true,"payload":{"entries":[{"jobId":"<job-id>","status":"ok","summary":"..."}]}}
```

---

## 2) 登录与角色（Auth / RBAC / Safe Mode）

### 2.1 登录（UI：`/login`）

1) 打开 `http://localhost:3000/login`
2)（可选）填写 **用户 ID**（默认提示 `local-admin`）
3) 填写 **TOTP**
   - 本地演示可用 `DEV-BYPASS`（如果启用了 DEV_BYPASS 流程）
4) 点击「登录」
5) 成功后会写入 **HttpOnly session cookie**（浏览器 JS 不可读）

对应 API：`POST /api/auth/login`

```bash
curl -X POST 'http://localhost:3000/api/auth/login' \
  -H 'content-type: application/json' \
  -d '{"user_id":"local-admin","otp":"DEV-BYPASS"}'
```

> 注意：实际环境下应使用真实 TOTP（以及妥善的用户/密钥管理）。

### 2.2 角色（RBAC）

系统角色为：

- `viewer`：只读（允许列表/详情/预览）
- `operator`：偏操作型角色（能力范围取决于具体 action 的最小权限要求）
- `admin`：可执行高危操作（仍受 Safe Mode + confirm gate 约束）

> UI 的禁用/隐藏仅是体验；**真正强制在服务端 BFF**。

### 2.3 Safe Mode（故障止血）

Safe Mode 开启时（服务端强制）：

- 允许只读查询（runs 列表、config current、audit 查询、memory 只读等）
- **拒绝**任何有副作用的动作
  - 配置 apply / rollback
  - memory trim（清理/裁剪）
  - 外发能力（如 external_send，若接入）

---

## 3) Runs / Tasks：创建与追踪闭环

### 3.1 UI 路径

- 创建 Run：`/ops`
- Runs 列表：`/tasks`
- Run 详情：`/tasks/[id]`

### 3.2 UI 操作步骤

1) 进入 `/ops`
2) 在「Create Run」卡片里填写：
   - `type`（示例：`ops.self_check`）
   - `reason`（建议写清楚“为什么做这个动作”，会进入审计）
3) 提交创建
4) 跳转到 `/tasks`，找到刚创建的 run
5) 打开 `/tasks/<run_id>` 查看：`status`、`input`、`result/error`、`artifacts`

> 当前状态流转由 **mock executor** 驱动（queued → running → succeeded），主要用于验收「可追踪闭环」。
> 如果配置了 Gateway（见上文），`/api/runs*` 会代理到 Gateway，状态来自真实执行引擎。

### 3.3 API 示例（curl）

创建 run：

```bash
curl -X POST 'http://localhost:3000/api/runs' \
  -H 'content-type: application/json' \
  -d '{
    "type": "ops.self_check",
    "reason": "demo",
    "input": {"scope": "local"}
  }'
```

获取 runs 列表：

```bash
curl 'http://localhost:3000/api/runs?limit=50'
```

获取 run 详情：

```bash
curl 'http://localhost:3000/api/runs/<run_id>'
```

---

## 4) Config Center：预览差异 → 应用/回滚（可审计、可回滚）

### 4.1 UI 路径

- 配置中心：`/config`

页面通常包含：

- **Current**：当前 version 与配置内容
- **Draft**：编辑 JSON 草稿
- **Preview diff**：预览差异（对敏感字段 mask）
- **Apply / Rollback**：高危操作，需要 **confirm gate**；**admin-only**；Safe Mode 下拒绝

### 4.2 UI 操作步骤（推荐）

1) 进入 `/config` → Current，记录 `currentVersion`
2) 在 Draft 中编辑 JSON（建议小步修改）
3) 点击 Preview diff，确认差异（敏感字段会被 mask）
4) 点击 Apply
5) 在确认弹窗（confirm gate）里确认提交，并填写/确认 reason
6) Apply 成功后会创建/返回一个 `run_id`（变更动作纳入 Runs 链路）
7) 如需回滚，选择目标版本后 Rollback，同样需要 confirm

### 4.3 API 示例（curl）

读取当前配置：

```bash
curl 'http://localhost:3000/api/config/current'
```

列出版本：

```bash
curl 'http://localhost:3000/api/config/versions'
```

预览差异（mask）：

```bash
curl -X POST 'http://localhost:3000/api/config/preview_diff' \
  -H 'content-type: application/json' \
  -d '{
    "base_version": "<current_version>",
    "config": {"example": true}
  }'
```

应用配置（admin-only；需要 `confirm=true`；Safe Mode 下拒绝）：

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

回滚（admin-only；需要 `confirm=true`；Safe Mode 下拒绝）：

```bash
curl -X POST 'http://localhost:3000/api/config/rollback' \
  -H 'content-type: application/json' \
  -d '{
    "target_version": "<some_version>",
    "reason": "rollback demo",
    "confirm": true
  }'
```

---

## 5) Security & Audit：只读审计视图（`/security`）

### 5.1 UI 操作步骤

1) 打开 `/security`
2) 在过滤框中输入：
   - **Action**（例如 `config.apply` / `runs.create` / `memory.trim`）
   - **Actor**（例如 `local-admin`）
   - **Start / End**（时间范围）
3) 点击「Apply filters」刷新列表
4) 如果某条审计记录的 resource 是 run，会出现跳转链接到 `/tasks/<run_id>`

### 5.2 API 示例（curl）

```bash
curl 'http://localhost:3000/api/audit?limit=200&action=config.apply'
```

---

## 6) Memory Center：列表 / 搜索 / 详情（以及清理/裁剪）

### 6.1 UI（viewer+）：`/memory` 与 `/memory/[id]`

- 列表页：`/memory`
  - 搜索框占位符：**“搜索关键字”**
  - 按钮：**“搜索”**
  - 表格列：文件 / 更新时间 / 预览
  - 点击文件名进入详情

- 详情页：`/memory/[id]`
  - 标题：**Memory Detail**
  - 顶部有「← 返回列表」
  - 正文以 `pre` 形式展示（**脱敏后内容**）

> 提示：默认从 `data/memory` 读取 `.md/.txt` 文件；列表/详情输出会做基础脱敏（token/secret 等替换为 `[REDACTED]`）。

### 6.2 API（viewer+）：列表 / 详情 / 搜索

列出记忆文件（支持 `q` substring 搜索，支持分页）：

```bash
curl 'http://localhost:3000/api/memory?limit=20&offset=0'
curl 'http://localhost:3000/api/memory?q=incident&limit=20&offset=0'
```

查看单条记忆（id 通常为文件名或其编码标识）：

```bash
curl 'http://localhost:3000/api/memory/<id>'
```

### 6.3 API（admin + confirm；Safe Mode 阻断）：清理/裁剪（trim）

> UI 可能暂未暴露清理按钮，但 API 已提供，并会写入审计。

按条件裁剪（示例：删除所有匹配 `q` 的记忆；需要 `confirm=true` + `reason`）：

```bash
curl -X POST 'http://localhost:3000/api/memory/trim' \
  -H 'content-type: application/json' \
  -d '{
    "query": "incident",
    "reason": "cleanup old debug notes",
    "confirm": true
  }'
```

---

## 7) 常见问题（Troubleshooting）

- **我能不用登录直接 curl 调 API 吗？**
  - 若启用了 Auth，你需要先在浏览器登录（或自行维护 cookie）。
- **为什么我 apply/rollback 被拒绝？**
  - 常见原因：角色不是 `admin`；或 Safe Mode 开启；或没带 `confirm=true`。
- **为什么我在审计里看不到记录？**
  - 审计为 best-effort；以及需要用过滤器放宽条件（先不填 Action/Actor）。
