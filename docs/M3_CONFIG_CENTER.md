# M3 — Config Center（配置中心）

> 本文档面向使用者/开发者，描述当前 Config Center 的接口、UI 使用方式与安全语义。
> 
> **边界声明（重要）**：
> - 目前系统已具备 Config Center 的 UI 与 API 入口（current / versions / preview_diff / apply / rollback）。
> - apply/rollback 当前以 **Runs** 的形式排队执行；部分执行语义仍处于从“mock executor”向“真实落盘语义”演进阶段。
> - 本文档会明确标注：**已实现（Implemented）** vs **计划（Planned）**，避免过度承诺。

## 0. 术语
- **Config**：系统配置对象（JSON）。
- **Version**：配置版本号（例如 v1/v2），由 `data/manifest.json` 管理。
- **Snapshot**：某一版本配置内容的落盘文件（`data/snapshots/<version>.json`）。
- **Runs**：高危操作统一走 run 记录，用于可追踪与审计。

## 1. UI 使用流程
路径：`/config`

典型流程（推荐）：
1) 查看当前配置（Current）
2) 编辑 Draft JSON（草稿）
3) Preview diff（敏感字段会被 mask）
4) Apply（需要 confirm）
5) 若出现问题，Rollback 到某个版本（需要 confirm）
6) 去 `/tasks` 查看 run 的执行状态与结果

## 2. API 一览与语义

### 2.1 GET /api/config/current（Implemented）
返回当前版本、etag 与 config 内容。

示例：
```bash
curl -sS http://localhost:3000/api/config/current | jq
```

返回字段：
- `current_version`: string
- `etag`: string
- `config`: object

权限：viewer 可读。

### 2.2 GET /api/config/versions（Implemented）
返回 manifest 的 current_version 与 entries。

示例：
```bash
curl -sS http://localhost:3000/api/config/versions | jq
```

返回字段：
- `current_version`: string
- `entries`: ManifestEntry[]

权限：viewer 可读。

### 2.3 POST /api/config/preview_diff（Implemented；输出 masked diff）
输入 draft config + base_version，返回 diff 预览。

示例：
```bash
curl -sS -X POST http://localhost:3000/api/config/preview_diff \
  -H 'content-type: application/json' \
  -d '{
    "config": {"featureFlag": true, "token": "should-mask"},
    "base_version": "v1"
  }' | jq
```

说明：
- 预览阶段不应落盘，不应改变 current_version。
- 对 token/password 等敏感字段做 mask。

权限：viewer 可读。

### 2.4 POST /api/config/apply（Implemented：排队为 run；语义演进中）
高危操作：需要 admin + confirm。

请求：
```json
{
  "config": {"featureFlag": true},
  "base_version": "v1",
  "author": "admin",
  "reason": "apply config",
  "confirm": true
}
```

响应（当前口径）：
```json
{ "status": "queued", "mode": "mock", "run_id": "..." }
```

规则：
- `confirm=true` 必填，否则 409 `CONFIRM_REQUIRED`
- 建议强制 `reason`（用于审计）
- `base_version` 用于乐观锁：若与 current_version 不一致，应拒绝（避免覆盖别人刚刚的变更）

Safe Mode：启用时应拒绝。

### 2.5 POST /api/config/rollback（Implemented：排队为 run；语义演进中）
高危操作：需要 admin + confirm。

请求：
```json
{
  "target_version": "v1",
  "author": "admin",
  "reason": "rollback",
  "confirm": true
}
```

响应（当前口径）：
```json
{ "status": "queued", "mode": "mock", "run_id": "..." }
```

规则：
- `confirm=true` 必填
- `target_version` 推荐为主口径；如需兼容旧口径可支持 `snapshot_id`

Safe Mode：启用时应拒绝（或以更严格策略允许只读回滚；以实际策略为准）。

## 3. 安全模型（RBAC / Safe Mode）
- viewer：只读（current/versions/preview_diff）
- admin：可 apply/rollback（但必须 confirm，并记录审计）
- Safe Mode：开启后禁止高危变更（apply/rollback 等）

## 4. 审计建议（Planned/Best-effort）
建议在审计事件中包含：
- actor/session（user_id/role/session_id）
- action/resource_type（config.apply/config.rollback）
- reason（高危操作必填）
- before/after version（apply/rollback 成功时）
- diff 摘要/引用（mask 后的变更摘要或 artifact 引用）

## 5. 已实现 vs 即将实现（能力矩阵）
| 能力 | 状态 | 说明 |
|---|---|---|
| current / versions / preview_diff | Implemented | 可读、可预览、mask 敏感字段 |
| apply/rollback 入口 + RBAC/Safe Mode + confirm gate | Implemented | 以 run 形式排队 |
| apply/rollback 真实落盘语义（manifest/snapshots 真正变化） | In progress | 作为 M3 解卡核心目标 |
| /security 审计面板可视化 | Planned | M3/M4 推进项 |

