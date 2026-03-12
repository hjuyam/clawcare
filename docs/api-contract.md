# API Contract (BFF) — 摘要

本文档定义 ClawCare **BFF 层**对 UI 暴露的 API 合约要点（摘要版）。

> 核心原则：**UI 不直连 OpenClaw Gateway**。所有跨部署路由、鉴权、脱敏、策略与审计都必须在 BFF 完成。

---

## 鉴权（Authentication）

当前实现：
- 登录接口：`POST /api/auth/login`
  - Body: `{ "otp": "123456", "user_id": "optional" }`
  - 成功后写入 **HttpOnly + SameSite=Lax** session cookie：`clawcare_session`
- 登出接口：`POST /api/auth/logout`
  - 清理 session cookie
- 登录方式：TOTP（`otplib`）
  - 默认读取 `data/users.json`（示例结构见下）
  - 若文件不存在，使用环境变量：`TOTP_SECRET` + `AUTH_ROLE` + `AUTH_USER_ID`
- 本地开发旁路：`DEV_BYPASS=1` 时允许 `otp=DEV-BYPASS`

RBAC：`admin / operator / viewer`
- `requireRole(minRole)` 中按角色等级拦截
- 低权限访问高权限接口会返回 `FORBIDDEN`

`data/users.json` 结构示例：
```json
{
  "users": [
    { "id": "local-admin", "role": "admin", "totp_secret": "BASE32SECRET" }
  ]
}
```

---

## 错误码与错误结构（Errors）

建议统一返回结构：
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "requestId": "..."
  }
}
```

仓库现状：`app/api/ops/_utils.ts` 已提供 `requestId` 与基础错误结构（`INVALID_JSON`、`VALIDATION_ERROR`）。

建议的错误码（可扩展）：
- `UNAUTHORIZED` / `FORBIDDEN`
- `NOT_FOUND`
- `POLICY_DENIED`（策略拒绝，含 reason）
- `UPSTREAM_UNAVAILABLE`（Gateway/外部依赖不可用）
- `RATE_LIMITED`

---

## 分页（Pagination）

对列表接口（如 runs、审计日志、记忆搜索）：
- 使用 **cursor-based** 分页
- 响应包含：`items[]`, `nextCursor`, `hasMore`

示例：
```json
{ "items": [], "nextCursor": "...", "hasMore": false }
```

---

## 幂等（Idempotency）

对有副作用的创建/触发接口（如 POST /runs、ops/cleanup、config/apply）：
- 支持 `Idempotency-Key` header
- 服务端在窗口期内去重（避免用户重复点击）

---

## 端点（Endpoints）

> 以下端点来自 clawcare.md 的建议合约；仓库中部分为占位/Mock，实现以当前代码为准。

### Capabilities（兼容性握手）
- `GET /api/capabilities`
  - 返回：gateway version、deployment（local/proxy/remote）、auth 支持、能力开关（supports_sse / nodes / memory / config_edit / channels...）

### Health
- `GET /api/health`
  - 返回：服务健康状态（仓库已有占位实现）

### Runs / Tasks（执行抽象）
- `POST /api/runs`：提交 run（输入 task_id / workflow_id / toolchain / params...）
- `GET /api/runs`：查询 runs（分页）
- `GET /api/runs/{id}`：run 详情
- `POST /api/runs/{id}/stop`：停止 run
- `GET /api/runs/{id}/events`：SSE 事件流（BFF 中继）

### Ops（高频运维）
- `POST /api/ops/self_check`：自检（仓库已有 mock 版本）
- `POST /api/ops/restart_gateway`
- `POST /api/ops/cleanup`：默认 dry-run，确认后执行
- `GET /api/ops/diagnostics_bundle`：导出脱敏诊断包

### Config / Version（变更、diff、回滚）
- `GET /api/config/current`：含 `current_version` + `etag`
- `POST /api/config/preview_diff`
- `POST /api/config/apply`
  - 必须带 `base_version`（避免并发覆盖）
  - 应用前自动快照，应用后可回滚
- `POST /api/config/rollback`

> 建议：每个 run 记录其使用的配置快照版本（`run_config_version` 或 config hash），回滚不影响已启动任务。

---

## 审计（Audit）

最小字段集合（脱敏，来自 clawcare.md）：
- `event_id`, `event_time`, `actor_type`, `actor_id`, `actor_ip`, `session_id`
- `action`, `resource_type`, `resource_id`, `environment`
- `request_id`, `trace_id`, `policy_decision`, `policy_reason`, `risk_level`
- `before_ref`, `after_ref`, `diff_summary`
- `status`, `error_code`, `error_message`, `duration_ms`
- `reason`（敏感操作必填）
