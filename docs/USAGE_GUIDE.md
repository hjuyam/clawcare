# ClawCare 使用指南（UI + API）

> 本文面向“想把 ClawCare 跑起来并走通核心流程”的使用者。
>
> **重要**：ClawCare 是 OpenClaw 的 **Control Plane UI（运维面板 + BFF）**。
> - 它提供：Auth/RBAC/Safe Mode、Runs/Tasks 追踪、Config Center（diff/apply/rollback）、审计（Audit）。
> - 它**不负责**：安装 OpenClaw Gateway、真实执行引擎（当前 executor 为 mock，见《边界与注意事项》）。

相关文档：
- 《边界与注意事项》：[`docs/BOUNDARIES_AND_GOTCHAS.md`](./BOUNDARIES_AND_GOTCHAS.md)
- API 合约摘要：[`docs/api-contract.md`](./api-contract.md)
- 项目状态：[`docs/STATUS.md`](./STATUS.md)

---

## 1. 启动（本地开发）

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

> 生产/部署相关内容不在本文范围；当前更偏本地/单实例开发运行。

---

## 2. 登录与角色（Auth / RBAC / Safe Mode）

### 2.1 登录（UI）
1) 打开 `/login`
2) 输入账号/密码登录
3) 登录成功后会拿到 **HttpOnly session cookie**（浏览器 JS 不可读）

### 2.2 角色（RBAC）
- `viewer`：只读（允许列表/详情/预览），禁止 apply/rollback 等有副作用的动作
- `admin`：可执行高危操作（仍受 Safe Mode + confirm gate 约束）

### 2.3 Safe Mode（故障止血）
Safe Mode 开启时：
- 允许只读查询（例如 runs 列表、config current、审计查询）
- **拒绝**任何有副作用的动作：配置 apply/rollback、ops 侧的高危动作等

> Safe Mode 的“拒绝”应由 **服务端 BFF 强制**（UI 的禁用只是体验）。

---

## 3. Runs / Tasks：创建与追踪闭环

### 3.1 UI 路径
- 创建 Run：`/ops`（Create Run 卡片）
- Runs 列表：`/tasks`
- Run 详情：`/tasks/[id]`

### 3.2 UI 操作步骤
1) 进入 `/ops`
2) 选择/填写 run type（示例：`ops.self_check`）与 reason
3) 提交创建
4) 跳转到 `/tasks` 或直接打开 `/tasks/<run_id>`
5) 在详情页查看：`status`、`input`、`result/error`、`artifacts`（如 diagnostics bundle 路径）

> 当前状态流转由 **mock executor** 驱动（queued → running → succeeded），主要用于“可追踪闭环”的验收。

### 3.3 API 示例（curl）

> 说明：若启用登录，你需要在浏览器登录后带上 cookie（或用 `-b cookie.txt` / `-c cookie.txt` 自行维护）。

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

获取 runs 列表：
```bash
curl 'http://localhost:3000/api/runs?limit=50'
```

获取 run 详情：
```bash
curl 'http://localhost:3000/api/runs/<run_id>'
```

---

## 4. Config Center：预览差异 → 应用/回滚（可审计、可回滚）

### 4.1 UI 路径
- 配置中心：`/config`

页面通常包含：
- Current：查看当前 version 与配置内容
- Draft：编辑 JSON 草稿
- Preview diff：预览（对敏感字段 mask）差异
- Apply / Rollback：需要 confirm gate；**admin-only**；Safe Mode 下拒绝

### 4.2 UI 操作步骤（推荐）
1) 进入 `/config` → Current，记录当前 `currentVersion`
2) 在 Draft 中编辑 JSON（建议小步修改）
3) 点击 Preview diff，确认差异（注意：敏感字段会被 mask）
4) 点击 Apply
5) 在弹出的确认（confirm gate）中确认提交
6) Apply 成功后会返回/创建一个 `run_id`（变更动作纳入 Runs 链路）
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

---

## 5. Security / Audit：查看审计记录

### 5.1 UI 路径
- 审计视图：`/security`

### 5.2 UI 操作步骤
1) 进入 `/security`
2) 通过 action/actor/time 等条件筛选
3) 点击单条记录可跳转关联 run（若该动作产生 run）

> 审计日志为 best-effort 落盘（通常写入 `data/audit/events.jsonl`）。详见《边界与注意事项》。

---

## 6. Memory Center（规划中 / 可能为占位页）

- UI：`/memory`
- 目标：记忆可见、可搜、可控（删除/保留）并与 RBAC/Safe Mode/Audit 对齐

> 以 `docs/STATUS.md` 为准：若页面存在但能力未完全落地，请以“占位/规划”口径对外沟通。
