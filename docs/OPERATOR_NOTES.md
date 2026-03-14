# ClawCare 运维说明（Operator Notes）

面向运维/部署人员的简明 runbook。

---

## 1) 部署拓扑与安全边界

- **UI + BFF 同仓**：ClawCare 的服务端 BFF 是安全边界。
- **浏览器永不直连 Gateway**：不要在前端暴露 Gateway URL 或 token。
- Gateway 建议仅对 BFF 可达（同机或内网）。

---

## 2) Gateway 集成（可选）

> 当你准备接入真实 OpenClaw Gateway 时使用。

设置环境变量：

```bash
CLAWCARE_GATEWAY_BASE_URL=http://127.0.0.1:18789
CLAWCARE_GATEWAY_AUTH_TOKEN=Bearer <token>
```

效果：
- `/api/capabilities` 与 `/api/runs*` 会代理到 Gateway。
- 未设置时，Runs 走本地 mock executor（演示闭环）。

**排查**：
- 确认 Gateway 可从 BFF 访问（curl `/capabilities`）。
- token 可用时避免 401/403。

---

## 3) 数据落盘位置（默认）

- Runs：`data/runs.json`
- Audit：`data/audit/events.jsonl`
- Config：`data/manifest.json` + `data/snapshots/`
- Memory：`data/memory/`
- Sessions：`data/sessions.json`

> 建议对 `data/` 做备份（尤其是 config + audit）。

---

## 4) Safe Mode 与 confirm gate

- Safe Mode 开启时，**所有写操作会被拒绝**（apply/rollback/trim 等）。
- 高危操作必须显式 `confirm=true`，并写入审计。

---

## 5) 认证与会话注意事项

- 生产必须设置 `SESSION_SECRET`。
- `DEV_BYPASS=1` 仅用于本地联调；**禁止生产启用**。
- 变更 `SESSION_SECRET` 会使现有 session 失效（等价强制下线）。

---

## 6) 常见故障排查

- **Runs 一直走 mock**：检查是否设置 `CLAWCARE_GATEWAY_BASE_URL`。
- **Gateway 401/403**：检查 `CLAWCARE_GATEWAY_AUTH_TOKEN` 是否正确。
- **审计缺口**：审计为 best-effort，IO 写入失败不会阻断主流程。

---

## 7) 推荐的启动方式（示例）

```bash
SESSION_SECRET=change-me \
CLAWCARE_GATEWAY_BASE_URL=http://127.0.0.1:18789 \
CLAWCARE_GATEWAY_AUTH_TOKEN=Bearer <token> \
npm run start
```

更多环境变量说明见：`docs/ENVIRONMENT.md`
