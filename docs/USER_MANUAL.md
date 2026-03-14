# ClawCare 用户手册（v0）

> 面向最终用户（运维/开发/个人站长）：把 ClawCare 当成 OpenClaw 的“默认安全运维面板”。
> 
> 你可以把本文当作“一个入口”：先看手册走通闭环；需要更细的证据/脚本再跳到各验收与测试报告。

**核心定位（一句话）**：ClawCare 是一个 Web 运维控制台（UI + 服务端 BFF），把 OpenClaw 的运维动作纳入 **登录/会话、RBAC、Safe Mode、二次确认、脱敏与审计、可回滚** 的闭环。

---

## 0) 你能用它做什么

v0 能力（按模块）：

- **登录与权限（M1）**：TOTP 登录 + Session；角色 `admin / operator / viewer`；Safe Mode 作为“保险丝”。
- **Runs/Tasks（M2）**：所有高危动作统一通过 run 记录；可在 `/tasks` 查看列表与详情。
- **配置中心（M3）**：配置 diff 预览（mask）→ apply（confirm gate）→ rollback（confirm gate），且有真实落盘语义（manifest+snapshots）。
- **安全与审计（M3.1）**：`/security` 只读审计视图（筛选 action/actor/time，关联 runs）。
- **记忆中心（M4）**：`/memory` 列表/搜索/详情（viewer+）；delete/trim（admin+confirm），Safe Mode 下阻断；输出基础脱敏。

---

## 1) 快速开始（本地开发）

建议先准备 `.env.local`（示例）：

```bash
DEV_BYPASS=1
AUTH_USER_ID=local-admin
AUTH_ROLE=admin
SESSION_SECRET=dev-session-secret
```

启动：

```bash
cd /root/aidev/clawcare
npm install
npm run dev
```

打开：<http://localhost:3000>

> DEV_BYPASS 仅用于本地联调/验收；不要在公网部署中启用。
> 环境变量详解见：`docs/ENVIRONMENT.md`。

---

## 2) 操作指引（按 UI 路径走）

### 2.1 登录（/login）
- 输入 OTP（本地可用 `DEV-BYPASS`）
- 登录后 Cookie 会话由服务端维护（前端不持有 gateway token）

### 2.2 触发动作（/ops）
- 在 Ops 页面触发动作（例如 self_check）
- 关键点：动作会生成 run（或直接返回结果，视 API 而定）

### 2.3 查看运行历史（/tasks）
- 列表查看最近 runs
- 点进去看单次 run 的输入/输出/错误/产物引用

### 2.4 配置中心（/config）
推荐流程：
1) Current：先看当前配置与版本号
2) Draft：编辑草稿 JSON
3) Preview diff：检查变更（敏感字段会 mask）
4) Apply：必须带 confirm + reason（会生成 run，并真实落盘）
5) Rollback：选择目标版本回滚（同样需要 confirm）

### 2.5 安全与审计（/security）
- 使用 Action/Actor/Start/End 过滤审计事件
- 如果 resource_type=runs，可直接跳转到对应 run 详情

### 2.6 记忆中心（/memory）
- 列表页支持 substring 搜索
- 点击文件进入详情
- 注意：内容会做基础脱敏（`[REDACTED]`）

---

## 3) 运维说明（Operator Notes）

- **安全边界**：UI 不直连 Gateway，所有请求经 BFF。
- **Gateway 集成（可选）**：设置 `CLAWCARE_GATEWAY_BASE_URL` / `CLAWCARE_GATEWAY_AUTH_TOKEN` 后，`/api/capabilities` 与 `/api/runs*` 会代理到 Gateway。
- **数据落盘**：默认在 `data/` 目录（runs/audit/config/memory/sessions），建议备份。
- **Safe Mode + confirm gate**：高危操作必须 confirm，Safe Mode 下强制阻断。

详细 runbook：`docs/OPERATOR_NOTES.md`

---

## 4) 边界与注意事项（必须读）

- 当前存储多为本地文件（best-effort），并发/多实例不保证强一致。
- Runs executor 在 v0 主要用于“可追踪闭环”，不等同于完整真实执行引擎。
- Safe Mode 开启后会阻断高危写操作（apply/rollback/delete/trim 等）。

详见：`docs/BOUNDARIES_AND_GOTCHAS.md`

---

## 5) 验收与测试入口（给验收/复现用）

- M1 安全验收：`docs/acceptance-m1-security.md`
- M3 配置中心验收：`docs/ACCEPTANCE_M3_CONFIG_CENTER.md`
- M4 记忆中心验收：`docs/ACCEPTANCE_M4_MEMORY_CENTER.md`
- M3 测试报告：`docs/TEST_REPORT_M3.md`
- M4 测试报告：`docs/TEST_REPORT_M4.md`

---

## 6) 视频讲解脚本（可直接照着录）

- `docs/VIDEO_WALKTHROUGH_SCRIPT.md`
