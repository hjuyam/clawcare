<callout emoji="bulb" background-color="light-blue">
**定位（最终版）**：**ClawCare（龙虾管家）** 是一个 Web 面板，让 OpenClaw 对“小白/非技术用户”更**好用、可控、可回滚**。
- **不负责安装**：默认假设 OpenClaw 已安装并可访问
- **默认本地打开**：localhost 是默认路径；反代自定义域名是进阶能力
- **核心能力**：高频运维 + 配置/记忆/备份版本管理（带安全护栏与审计）
</callout>

---

## 1. 目标与边界
### 1.1 产品目标（Success）
- **低门槛**：用户不需要懂 OpenClaw 内部结构，能“连接成功→点按钮→拿结果”
- **默认安全**：secrets 不落前端；外发/写入/删除等高危动作可控（确认+策略+审计）
- **可回滚**：任何配置/Prompt/Heartbeat/策略变更都可 diff + 回滚 + 自动自检
- **跨部署一致**：Win/Mac 本地、Linux 云端、远程/反代都用同一套 UI 体验
### 1.2 非目标（Not in scope）
- OpenClaw 的安装/编译/部署向导（可作为后续路线图）
- 将面板做成 IDE / 自由多窗口桌面（P2 可考虑 Power Mode，但首发不做）
---

## 2. 首发用户体验（North Star）
### 2.1 Beginner / Advanced 双轨（渐进披露）
<callout emoji="white_check_mark" background-color="light-green">
**Beginner（默认）**：只呈现价值与安全护栏（状态 + 修复 + 基础设置）。
**Advanced（开关进入）**：全量控制台能力（Config Center / Memory / Ops / Security & Audit / Release Center）。
</callout>

### 2.2 30 秒见价值路径
1. 打开面板（默认 localhost）→ 连接检测（自动）
1. 首页看到“你现在状态如何/下一步怎么做”（人话）
1. 失败时：给“可操作修复（1-3 步）”+ 一键导出诊断信息
---

## 3. 信息架构（IA）与页面说明
### 3.1 顶级导航（建议 7 个入口）
1. **Home**：状态概览 + 异常/待处理（人话）
1. **Connect**：本机/远程/反代域名连接；连通性与能力探测
1. **Tasks & Runs**：统一 Runs/Tasks 入口 + 运行历史 + 单次运行详情
1. **Ops**：重启/自检/诊断/清理（优先“按症状向导”，按钮折叠）
1. **Config**：Basic Settings（轻量表单） + Config Center（专家区，全量编辑）
1. **Memory**：浏览/搜索/删除/保留策略（首发最小版）
1. **Security & Audit**：安全评分+必做清单、审计检索、Safe Mode
> **Release Center（发布与回滚）**：建议作为 Advanced 下的二级入口（或并入 Ops/Config 的二级页）。
### 3.2 ⌘K 命令面板（效率入口）
- Open last run logs
- Export diagnostics bundle
- Backup now / Rollback to version …
- Restart gateway / Run self-check / Trigger cleanup
### 3.3 页面引导文案（每页一句）
- Home：从这里开始：先确认环境正常，再逐步开启高级能力。
- Ops：遇到异常先别慌：一键体检、生成诊断报告，需要时再执行修复动作。
- Backups & Rollback：任何改动都可追溯：先看差异，再一键回到可用版本。
- Config Center：这里是专家区：改之前会自动备份，改之后可对比 diff 并随时回滚。
- Memory：把结果沉淀成长期记忆：可搜索、可整理、也可随时清理或导出。
- Security & Audit：默认更安全：开启必要防护后，再考虑远程访问与外发能力。
---

## 4. 功能清单（最终版：P0/P1/P2）
### 4.1 P0（必须：可用、可控、可回滚、默认安全）
#### 4.1.1 面板对“任务”的定位（不内置具体用法模板）
<callout emoji="bulb" background-color="light-blue">
本项目**不内置“你应该用 OpenClaw 做什么”的模板任务**。
原因：这是一个“让 OpenClaw 更好用、更可维护”的面板，不承担教学职责；如何使用 OpenClaw 完成业务，是用户自己的选择。
面板只提供：
- 统一的 **Runs/Tasks 执行入口**（对接 OpenClaw 的实际运行能力）
- 标准化的 **运行过程/日志/产物** 展示
- 可控的 **权限/策略/确认门禁**（避免误操作）
</callout>

**仍保留的能力（开发相关）**
- 面板支持“运行一个任务”这一抽象：
  - 输入：task_id / workflow_id / toolchain / 参数
  - 输出：run_id、状态、日志事件流（SSE）、产物引用
- 面板可提供“示例 run（自检/诊断/连通性测试）”，但不提供业务用途模板。
#### 4.1.2 高频运维（重运维，但带保险丝）
- 重启 gateway
- 自检（连通性/能力/授权/资源）
- 导出诊断包（脱敏）
- 触发清理：默认 dry-run → 用户确认后执行
- 更新检查：提示升级，不强制升级
#### 4.1.3 配置中心（全都要：模型 + 核心文件 + subagent prompts）
<callout emoji="gift" background-color="light-yellow">
强制规则：任何配置/Prompt/Heartbeat 修改都必须走：**自动备份 → diff 预览 → 应用 → 可回滚 → 审计**。
</callout>

覆盖范围：
- 模型配置（provider/model/fallback/预算/限额）
- 核心文件：SOUL / AGENTS / USER / IDENTITY / HEARTBEAT
- Subagent prompts（全量）
交互方式：
- Basic Settings（面向小白）：少量表单 + “测试可用性”按钮
- Config Center（专家区）：默认只读；“启用编辑”后可改；保存前必有 diff 预览
#### 4.1.4 记忆中心（最小可用）
- 浏览：今日/昨日/近7天
- 搜索：关键词 + 来源过滤（对话/任务/网页/文件）
- 控制：Pin / Delete / 保留策略（最小版）
- 安全：敏感内容脱敏；删除支持撤销/回收站（能力允许时）
#### 4.1.5 备份与版本管理（Backup / Version）
- 自动快照：每次变更前自动备份
- 版本链：不可变版本号 + hash/etag
- diff：至少支持文本 diff（敏感值打码）
- 一键回滚：回滚后自动自检
- 备份有效性校验：hash + 可恢复标记；失败不进入可回滚列表
#### 4.1.6 安全与审计（P0 基线）
- 登录：TOTP（或更强）+ 会话管理（设备列表、强制下线、过期）
- RBAC：至少 Admin/Operator/Viewer；Viewer 无写操作
- 敏感操作二次确认 + 强制 reason（入审计）
- secrets 不落浏览器：前端只用 HttpOnly session；token 只显示指纹/尾号
- 输出渲染防注入：sanitize + CSP
- SSRF 防护：禁止 metadata IP/内网段访问（在外联能力启用时）
- Safe Mode：只读 + 禁外发 + 禁修改配置（故障期保命）
- 审计日志：login/config_change/tool_call/external_send（追加写、不可篡改）
---

### 4.2 P1（强烈建议：更“产品化”、更省心）
- 命令面板（⌘K）全量动作
- 安全评分 + 必做清单 + 一键修到推荐状态
- 外联/外发 allowlist（工具/域名/目标会话）
- 成本水龙头（预算/并发/每小时外发上限）
---

### 4.3 P2（锦上添花）
- Power Mode（预设布局工作区：Debug/Ops/Build）
- 运行回放（timeline 回放）
- 可视化工作流编排（轻量）
---

## 5. 系统架构（最终版）
<whiteboard token="UBltwpwKRh76qbbDIKQchlNfnUf" align="left"/>

关键原则：
- UI 永远不直连 Gateway（避免公网暴露执行引擎与 token）
- BFF 负责：鉴权、跨部署路由抽象、脱敏、审计、SSE/WS 中继、策略护栏
---

## 6. API Contract（建议）
### 6.1 Capabilities（兼容性握手）
- `GET /api/capabilities`
- 返回：gateway version、deployment（local/proxy/remote）、auth 支持、supports_sse/browser/nodes/memory/config_edit、supported_channels
### 6.2 Runs / Tasks（抽象层）
- `POST /api/runs`（提交 run）
- `GET /api/runs` / `GET /api/runs/{id}` / `POST /api/runs/{id}/stop`
- `GET /api/runs/{id}/events`（SSE）
### 6.3 Ops
- `POST /api/ops/self_check`
- `POST /api/ops/restart_gateway`
- `POST /api/ops/cleanup`（dry-run 默认）
- `GET /api/ops/diagnostics_bundle`
### 6.4 Config / Version
- `GET /api/config/current`（含 current_version + etag）
- `POST /api/config/preview_diff`
- `POST /api/config/apply`（必须带 base_version；应用前自动快照）
- `POST /api/config/rollback`
<callout emoji="white_check_mark" background-color="light-green">
建议：每个 run 记录使用的配置快照版本（run_config_version 或 config hash），回滚不影响已启动任务。
</callout>

---

## 7. 审计日志（Minimal Schema）
最小字段集合（脱敏）：
- event_id, event_time, actor_type, actor_id, actor_ip, session_id
- action, resource_type, resource_id, environment
- request_id, trace_id, policy_decision, policy_reason, risk_level
- before_ref, after_ref, diff_summary
- status, error_code, error_message, duration_ms
- reason（敏感操作必填）
---

## 8. Release Center（发布与回滚：上线证据四件套）
每次“发布/回滚”生成一个 Release Run 作为证据容器：
1. 发布记录（人/时间/环境/目标/risk/reason/策略决策）
1. 配置差异 Diff（字段级；敏感值打码）
1. 备份与恢复证明（快照ID、清单hash、校验状态、可恢复标记）
1. 发布后验证（健康检查 + 冒烟自检结果）
---

## 9. Top 风险与规避（最终版）
1. 跨部署兼容导致连接/鉴权碎片化 → UI 只连 BFF；BFF 维护 deployment profiles；capabilities 明确 base_url/auth
1. 配置编辑/回滚冲突造成运行时不一致 → Config 强制 base_version；run 绑定 config snapshot；回滚后自动自检
1. 外联链路不稳定（反爬/登录墙/网络） → 分层降级与可操作错误码；提供诊断与修复路径
---

## 10. 项目命名（已定稿）
- 英文：**ClawCare**
- 中文：**龙虾管家**
