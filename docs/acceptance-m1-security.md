# M1 验收说明（安全 & 权限 & 审计）

面向：**非开发验收人员**（产品/测试/交付/运维）。

> 本文聚焦 **M1 安全基线**：如何登录、角色权限、Safe Mode 行为、审计日志记录与查询方式。
> 
> 说明：当前仓库中部分能力仍处于 **占位/Mock** 阶段（例如页面文案、部分接口的业务结果）。但 **审计日志（JSONL 落盘）** 已具备最小可用实现，可用于验收“是否会记录、是否可查询、是否脱敏”。

---

## 0. 验收范围与前置条件

### 0.1 范围（M1）
- **登录与会话（含 DEV_BYPASS 仅本地）**：验收“是否存在强登录入口/开关、DEV_BYPASS 是否只在本地生效”。
- **RBAC 角色权限矩阵**：Admin / Operator / Viewer 的允许/禁止动作。
- **Safe Mode**：故障期保命的“只读 + 禁外发 + 禁改配置”策略。
- **审计日志**：记录哪些事件、是否脱敏、如何查询。

### 0.2 前置条件
- ClawCare 可本地启动：
  ```bash
  npm install
  npm run dev
  # http://localhost:3000
  ```
- 数据目录（运行时自动创建）：
  - `data/audit/events.jsonl`（审计事件追加写）
  - `data/manifest.json` + `data/snapshots/*.json`（配置快照与版本）

---

## 1. 如何登录（含 DEV_BYPASS，仅本地）

### 1.1 正常模式（推荐：用于生产/联调）
M1 安全基线要求：
- **强登录**（例如 TOTP/SSO 等）
- 会话使用 **HttpOnly Cookie**（浏览器不持有长期 secrets）

验收点（面向“行为”）：
1. 未登录访问受保护页面/接口，应被引导至登录（或返回 `401/403`）。
2. 登录成功后，浏览器存储的是 **HttpOnly session**（不在 LocalStorage/JS 变量中存储 token）。
3. 支持退出登录/会话过期（过期后重新登录）。

> 注：当前仓库的 UI/Route Handlers 仍以“打通 UI→BFF 链路”为主，鉴权实现可能处于后续里程碑。

### 1.2 DEV_BYPASS（仅本地开发/演示）
当需要在**本地**快速演示/联调时，可以启用 DEV_BYPASS（跳过登录），但必须满足以下验收约束：

**DEV_BYPASS 约束（验收必须通过）**
- 只能在 **本机回环地址** 使用：`localhost` / `127.0.0.1` / `::1`
- 只能在 **非生产构建** 使用（development 模式）
- 页面必须显示明显的 **“DEV_BYPASS 已开启”** 提示（避免误把无鉴权服务暴露到公网）

**建议的启用方式（约定）**
- 环境变量：`DEV_BYPASS=1`（或同等命名约定）
- 启用后：访问 `http://localhost:3000` 不再要求登录

> 如果验收环境看到“无需登录即可操作”，应被视为 **DEV_BYPASS 模式**；此模式不允许在反代域名/公网环境出现。

---

## 2. 角色权限矩阵（Admin / Operator / Viewer）

M1 的 RBAC 目标：**默认更安全**，最小权限可用。

> 原则：UI 上的按钮隐藏/禁用只是体验优化；**最终强制必须在 BFF（服务端）做权限校验**。

### 2.1 权限矩阵（M1）

| 模块/动作 | Admin | Operator | Viewer |
|---|---:|---:|---:|
| 查看健康状态（/api/health、Capabilities） | 允许 | 允许 | 允许 |
| 查看审计日志（Audit list/search） | 允许 | 允许 | 允许（只读） |
| 写入审计事件（系统内部写入） | 允许 | 允许 | 禁止（不应允许用户伪造） |
| 查看配置当前版本（config current） | 允许 | 允许 | 允许（只读） |
| 预览配置 diff（preview_diff） | 允许 | 允许 | 禁止/可选（建议禁） |
| 应用配置（config apply） | 允许 | 允许（需 reason） | 禁止 |
| 回滚配置（config rollback） | 允许 | 允许（需 reason） | 禁止 |
| Ops：自检（self_check） | 允许 | 允许 | 允许（只读结果） |
| Ops：重启 gateway（restart） | 允许 | 允许（需 reason） | 禁止 |
| Ops：清理（cleanup） | 允许 | 允许（需 confirm+reason） | 禁止 |
| 导出诊断包（diagnostics bundle） | 允许 | 允许 | 禁止/可选（建议禁） |
| 任何“外发/外联/执行 run”类动作 | 允许（受策略） | 允许（受策略） | 禁止 |

### 2.2 高危动作的“二次确认 + reason”
以下动作在 M1 中应被视为高危（必须二次确认 + reason，并写入审计）：
- 清理（cleanup 执行态，非 dry-run 预览）
- 重启 gateway
- 配置 apply / rollback
- 任何外发（external_send）、外联（fetch/浏览器自动化等）

---

## 3. Safe Mode（安全模式）的行为

Safe Mode 的目标：当系统处于异常/被怀疑入侵/需要止血时，快速进入“保命模式”。

### 3.1 Safe Mode 核心规则
Safe Mode 开启后：
- **只读**：禁止所有会改变系统状态的动作
- **禁外发**：禁止任何对外发送（消息/邮件/文件上传等）
- **禁改配置**：禁止 apply/rollback（防止进一步破坏）

### 3.2 Safe Mode 下允许/禁止的动作（M1）

**允许（只读）**
- 查看：Home / 状态 / Capabilities
- 查看：审计日志（只读查询）
- 查看：配置当前版本、历史版本列表（只读）
- 执行：自检（如果自检被定义为“只读探测”，可允许）

**禁止（有副作用）**
- 配置：apply、rollback
- Ops：restart_gateway、cleanup（无论是否 confirm）
- 诊断包导出（可选：如含敏感信息，建议禁）
- 任何执行类能力（Runs/Tasks）、以及任何外联/外发

### 3.3 验收点
1. 开启 Safe Mode 后，上述“禁止动作”在 UI 层应禁用/隐藏，并在 BFF 层返回明确错误（如 `POLICY_DENIED`）。
2. 审计日志应记录 Safe Mode 的开启/关闭，以及被拒绝的高危请求（含 `policy_decision=deny` 与原因）。

---

## 4. 审计日志：记录哪些事件、如何查询

### 4.1 记录哪些事件（M1 最小集）
建议至少覆盖（来自 `clawcare.md` / `SECURITY.md`）：
- `login`（登录/登出/会话失效）
- `config_change`（preview/apply/rollback）
- `tool_call` / `ops.*`（自检、重启、清理、诊断包）
- `external_send`（对外发送/外联触发）

当前仓库中已接入的最小示例（Mock 也会写入审计）：
- `ops.cleanup`（`/api/ops/cleanup`）
- `config.apply`（`/api/config/apply`，冲突/成功都会记）

### 4.2 审计日志的落盘位置（当前实现）
- 文件：`data/audit/events.jsonl`
- 格式：**一行一个 JSON**（JSONL，追加写）

脱敏规则（当前实现，见 `app/api/_lib/audit.ts`）：
- key 名包含 `token` / `apikey` / `api_key` / `password` 的字段会被替换为 `"***"`

### 4.3 如何查询（UI / API / 文件）

#### A) API 查询（推荐验收方式）
- 列表查询：
  - `GET /api/audit`
  - 支持 query：`action`、`resource_type`

示例：
```bash
curl 'http://localhost:3000/api/audit'
curl 'http://localhost:3000/api/audit?action=config.apply'
curl 'http://localhost:3000/api/audit?resource_type=ops'
```

#### B) 写入一条审计事件（用于验收/演示）
- `POST /api/audit/log`

示例（会自动补齐 event_id/event_time，并做脱敏）：
```bash
curl -X POST 'http://localhost:3000/api/audit/log' \
  -H 'content-type: application/json' \
  -d '{
    "action": "demo.event",
    "resource_type": "demo",
    "status": "ok",
    "reason": "acceptance test",
    "token": "should_be_redacted"
  }'
```

验收点：落盘后在 `GET /api/audit?action=demo.event` 能检索到，且 `token` 字段为 `***`。

#### C) 直接查看文件（最直观）
```bash
tail -n 20 data/audit/events.jsonl
```

---

## 5. 验收清单（可直接勾选）

- [ ] **DEV_BYPASS 仅本地**：开启后只能在 localhost 生效，且页面有醒目标识
- [ ] **RBAC**：Viewer 无任何写操作；Operator/Viewer 无法执行高危动作
- [ ] **Safe Mode**：开启后所有有副作用接口返回拒绝（且写入审计）
- [ ] **审计落盘**：所有高危动作/策略拒绝都有事件记录
- [ ] **审计可查询**：可按 action/resource_type 检索
- [ ] **脱敏有效**：token/apikey/password 等字段不会以明文写入审计

---

## 6. 关联文档
- `SECURITY.md`：安全基线与威胁模型
- `docs/api-contract.md`：BFF API 合约摘要（鉴权/错误码/审计字段）
- `clawcare.md`：产品定位与 P0 安全需求（Safe Mode、RBAC、审计）
