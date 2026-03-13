# ClawCare（龙虾管家）

ClawCare 是一个 **Web 运维面板（OpenClaw Control Plane UI + BFF）**：把高频运维动作包进一个 **默认安全** 的服务端控制层，提供 **可审计**、**可回滚**、**可追踪（Runs/Tasks）** 的操作闭环。

一句话：**UI 不直连 OpenClaw Gateway**；鉴权/RBAC/Safe Mode/脱敏/审计都在服务端完成。

---

## 你应该先读什么（按优先级）

- 使用指南（UI 步骤 + curl）：[`docs/USAGE_GUIDE.md`](./docs/USAGE_GUIDE.md)
- 边界与注意事项（哪些是 mock、哪些不保证）：[`docs/BOUNDARIES_AND_GOTCHAS.md`](./docs/BOUNDARIES_AND_GOTCHAS.md)
- 当前里程碑状态（M1/M2/M3/M4）：[`docs/STATUS.md`](./docs/STATUS.md)
- 安全模型与威胁口径：[`SECURITY.md`](./SECURITY.md) + [`docs/acceptance-m1-security.md`](./docs/acceptance-m1-security.md)

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

## 核心流程（你能用它做什么）

> 下面是“跑起来之后最该先走通”的 5 条路径；更细步骤见《使用指南》。

1) **登录与安全护栏**：`/login`（Auth/Session） + RBAC（admin/viewer） + Safe Mode（故障期止血）
2) **Runs/Tasks 追踪闭环**：`/ops` 创建 run → `/tasks` 列表 → `/tasks/[id]` 详情
3) **Config Center（可回滚）**：`/config` Draft JSON → Preview diff（mask）→ Apply / Rollback（confirm gate，admin-only）
4) **Security / Audit 审计**：`/security` 查询、筛选、关联 runs
5) **Memory Center（规划/可能为占位页）**：`/memory`

---

## 当前实现概览（诚实版）

- ✅ **M1 安全基线**：Auth/Session、RBAC、Safe Mode、Policy deny、审计（best-effort）、E2E 合约测试
- ✅ **M2 Runs/Tasks 最小闭环**：创建/列表/详情 + 文件持久化（best-effort） + UI 轮询
- ✅ **M3 Config Center**：preview diff（mask）+ apply/rollback（confirm gate）+ **真实落盘语义**（manifest/snapshots）+ run/audit 串联

**明确限制（必须对外说明）**：
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
