# ClawCare（龙虾管家）

ClawCare 是一个 **“默认安全（secure-by-default）”的运维控制台**：

- 前端：Next.js Web UI
- 后端：同仓 BFF（Route Handlers）
- 目标：把高频运维动作纳入 **鉴权 / RBAC / Safe Mode / 二次确认 / 脱敏 / 审计** 的服务端控制层，并提供 **Runs/Tasks 闭环追踪**。

一句话：**UI 不直连 OpenClaw Gateway**；高危操作的护栏与审计都在服务端完成。

> v0 口径（务必对外一致）：目前 Runs 的 executor **仍是 mock**，用于验证「可追踪闭环」与「默认安全」的产品形态；不是“真实执行引擎”。

---

## 先看什么（从这里开始）

- 使用指南（UI 步骤 + curl）：[`docs/USAGE_GUIDE.md`](./docs/USAGE_GUIDE.md)
- 边界与注意事项（哪些是 mock / best-effort）：[`docs/BOUNDARIES_AND_GOTCHAS.md`](./docs/BOUNDARIES_AND_GOTCHAS.md)
- 当前里程碑状态（M1~M4）：[`docs/STATUS.md`](./docs/STATUS.md)
- 安全模型与威胁口径：[`SECURITY.md`](./SECURITY.md)

---

## 快速开始（本地开发）

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

---

## 5~8 分钟“从 0 到走通”的推荐路径（适合录屏/演示）

> 更细的 UI 按钮/字段名、以及对应 API 示例，请看《使用指南》。

1) **登录（TOTP）**：`/login`（写入 HttpOnly session cookie）
2) **Runs/Tasks 闭环**：`/ops` 创建 run → `/tasks` 列表 → `/tasks/[id]` 详情追踪
3) **Config Center（可回滚）**：`/config` Draft JSON → Preview diff（mask）→ Apply / Rollback（admin-only，confirm gate）
4) **Security & Audit（只读审计视图）**：`/security` 过滤 action/actor/time，并可关联到 run
5) **Memory Center（可见/可搜/可控）**：`/memory` 列表/搜索 → `/memory/[id]` 详情（脱敏展示）

录屏脚本大纲见：[`docs/VIDEO_WALKTHROUGH_SCRIPT.md`](./docs/VIDEO_WALKTHROUGH_SCRIPT.md)

---

## 当前实现概览（诚实版）

- ✅ **M1 安全基线**：TOTP 登录 + Session、RBAC（admin/operator/viewer）、Safe Mode、Policy deny 审计（best-effort）
- ✅ **M2 Runs/Tasks 最小闭环**：创建/列表/详情 + 文件持久化（best-effort） + UI 轮询
- ✅ **M3 Config Center**：preview diff（mask）+ apply/rollback（confirm gate）+ manifest/snapshots 落盘 + run/audit 串联
- ✅ **M4 Memory Center**：列表/详情/搜索（viewer+）+ trim（admin+confirm，Safe Mode 阻断）+ 基础脱敏

明确限制（必须对外说明）：

- **Runs 的 executor 目前是 mock**：用于“可追踪闭环”，不是“真实执行引擎”。
- **存储以本地文件为主（best-effort）**：默认适配单实例/本地 demo，不保证多实例强一致。

详见：[`docs/BOUNDARIES_AND_GOTCHAS.md`](./docs/BOUNDARIES_AND_GOTCHAS.md)

---

## 代码结构（快速定位）

```text
clawcare/
  app/                 # Next.js App Router
    api/               # BFF APIs（Route Handlers）
    (pages)/           # /tasks /ops /config /memory /security ...
  data/                # 本地落盘（runs/audit/config snapshots/artifacts）
  docs/
  tests/
```

---

## 文档索引

- Docs IA：[`docs/README.md`](./docs/README.md)
- API 合约摘要：[`docs/api-contract.md`](./docs/api-contract.md)
- M3 验收脚本与证据链：[`docs/ACCEPTANCE_M3_CONFIG_CENTER.md`](./docs/ACCEPTANCE_M3_CONFIG_CENTER.md)
- M4 验收脚本与证据链：[`docs/ACCEPTANCE_M4_MEMORY_CENTER.md`](./docs/ACCEPTANCE_M4_MEMORY_CENTER.md)
