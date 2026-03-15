# ClawCare 环境配置（Environment）

本文汇总 ClawCare 运行时可用的环境变量（BFF + UI）。

> 推荐用 `.env.local`（本地开发）或部署系统的环境变量注入方式。

---

## 1) 最小可用（本地开发）

```bash
# .env.local
DEV_BYPASS=1
AUTH_USER_ID=local-admin
AUTH_ROLE=admin
# SESSION_SECRET 用于签名 session cookie（生产环境必须设置）
SESSION_SECRET=dev-session-secret
```

- `DEV_BYPASS=1` 允许使用 `DEV-BYPASS` 作为 OTP（仅本地联调）。
- 如需真实 TOTP，则设置 `TOTP_SECRET`（见下）。

---

## 2) 认证与会话

| 变量 | 作用 | 备注 |
| --- | --- | --- |
| `SESSION_SECRET` | Session cookie 签名密钥 | **生产必须设置**；修改会使现有 session 失效 |
| `AUTH_USER_ID` | 默认用户 ID | 未配置 `data/users.json` 时的 fallback |
| `AUTH_ROLE` | 默认用户角色 | `admin` / `operator` / `viewer`；fallback |
| `TOTP_SECRET` | 默认用户 TOTP 密钥 | 未配置 `data/users.json` 时使用 |
| `DEV_BYPASS` | 开启 OTP 旁路 | `1` 启用 `DEV-BYPASS`；仅本地 |

> `data/users.json` 存在时优先使用文件配置。

---

## 3) Gateway 集成（可选）

当设置以下变量时，`/api/capabilities` 与 `/api/runs*` 会转发到 OpenClaw Gateway：

| 变量 | 作用 | 示例 |
| --- | --- | --- |
| `CLAWCARE_GATEWAY_BASE_URL` | Gateway HTTP 基础地址 | `http://127.0.0.1:18789` |
| `CLAWCARE_GATEWAY_AUTH_TOKEN` | Gateway 认证 token | `Bearer xxx` 或 `xxx` |
| `CLAWCARE_GATEWAY_BASE_PATH` | HTTP API 前缀（可选） | `/api` / `/v1` |

### WS 模式（推荐用于本机 Gateway）

OpenClaw Gateway 原生是 **WebSocket 控制平面**，如果没有暴露 `/runs` HTTP API，可用 WS 模式：

| 变量 | 作用 | 示例 |
| --- | --- | --- |
| `CLAWCARE_GATEWAY_MODE` | `ws` 启用 WS RPC | `ws` |
| `CLAWCARE_GATEWAY_WS_URL` | Gateway WS 地址 | `ws://127.0.0.1:18789` |
| `CLAWCARE_GATEWAY_SCOPES` | 连接 scopes（逗号分隔） | `operator.read,operator.write` |

**注意**：UI 不直连 Gateway，所有请求走 BFF。

---

## 4) 存储路径（可选）

| 变量 | 作用 | 默认 |
| --- | --- | --- |
| `CLAWCARE_RUNS_PATH` | Runs 文件路径 | `data/runs.json` |
| `CLAWCARE_MEMORY_DIR` | Memory 目录 | `data/memory/` |

---

## 5) 预留/实验性

| 变量 | 作用 | 备注 |
| --- | --- | --- |
| `OPENCLAW_GATEWAY_URL` | OpenClaw Gateway URL | 目前仅用于实验性 client，尚未完全接入 |
| `OPENCLAW_GATEWAY_TOKEN` | OpenClaw Gateway Token | 同上 |

---

## 6) 其他常见变量

| 变量 | 作用 | 备注 |
| --- | --- | --- |
| `PORT` | Next.js 监听端口 | 默认 3000 |
| `NODE_ENV` | 运行模式 | `production` 会启用 secure cookie |
