# Security

ClawCare 的定位是“让 OpenClaw 更好用、更可维护”的运维面板，因此安全基线以 **默认安全 + 最小暴露面 + 可审计可回滚** 为核心。

> 关键原则：**UI 不直连 Gateway**。所有对外能力经由 BFF 统一鉴权、路由、脱敏与策略控制。

---

## 安全概述

ClawCare 主要保护的对象：
- OpenClaw 的执行能力（避免被未授权触发）
- 凭据与敏感配置（避免泄漏到浏览器/日志）
- 运维动作与变更历史（可追溯、可回滚、可审计）

基础安全能力（P0 目标，来自 clawcare.md）：
- 登录：TOTP（或更强）+ 会话管理（设备列表、强制下线、过期）
- RBAC：至少 Admin/Operator/Viewer（Viewer 无写操作）
- 敏感操作二次确认 + 强制填写 reason（入审计）
- secrets 不落浏览器：前端只用 HttpOnly session；token 只显示指纹/尾号
- 输出渲染防注入：sanitize + CSP
- SSRF 防护：外联能力启用时，禁止 metadata IP/内网段等
- Safe Mode：只读 + 禁外发 + 禁修改配置（故障期保命）
- 审计日志：login/config_change/tool_call/external_send（追加写、不可篡改）

---

## 威胁模型（简化 STRIDE）

| 类别 | 风险示例 | 关键缓解 |
|---|---|---|
| S - Spoofing（冒充） | 未授权用户冒充管理员操作 | 强鉴权（TOTP/SSO 可选）、会话绑定、设备管理、RBAC |
| T - Tampering（篡改） | 配置/Prompt 被悄悄修改 | 变更强制备份→diff→apply→可回滚；审计追加写；base_version/etag |
| R - Repudiation（抵赖） | “我没点过删除/外发” | 高危动作强制 reason；审计记录 actor/session/requestId |
| I - Information Disclosure（泄露） | secrets 出现在前端/日志/诊断包 | secrets 不下发；日志/诊断包脱敏；最小字段返回；token 仅指纹 |
| D - Denial of Service（拒绝服务） | 大量 runs/外联导致资源耗尽 | 并发/预算限制；速率限制；成本水龙头；安全评分与必做清单 |
| E - Elevation of Privilege（提权） | Viewer 绕过 UI 调用写接口 | BFF 侧强制权限校验；禁用直连 Gateway；服务器端策略判断 |

---

## 安全红线（必须遵守）

1. **日志脱敏**
   - 任何日志/诊断包不得输出：token、cookie、私钥、完整 bearer、用户隐私
   - 对可能的敏感值做掩码（只保留尾号/指纹）

2. **鉴权与授权**
   - 所有 `/api/*` 写接口必须鉴权 + RBAC
   - 高危动作必须：二次确认 + reason + 审计

3. **输入校验**
   - 不信任任何来自浏览器的输入（body/query/path）
   - 统一用 schema（如 Zod）校验；拒绝无效 JSON（见现有 `_utils.ts`）

4. **禁止 UI 直连 Gateway**
   - 不在前端存储/拼接 gateway token
   - 任何跨部署路由、SSE 中继、脱敏必须在 BFF 完成

---

## 漏洞报告流程

- **请勿** 在公开 Issue 或公共渠道披露可被利用的细节
- 通过以下方式私下报告：
  1. 创建私密工单 / 私聊维护者（推荐）
  2. 若仓库启用安全邮箱：发送至 `security@<your-domain>`（如未来配置）

报告内容建议包含：
- 影响范围与严重性评估（可选 CVSS）
- 复现步骤 / POC（最小化）
- 可能的修复建议
- 版本/commit 信息

维护者响应目标（建议）：
- 48 小时内确认收到
- 7 天内给出初步评估与修复计划

