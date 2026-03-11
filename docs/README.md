# ClawCare Docs

开发者文档导航（IA）。

## 入口

- **API Contract**
  - `api-contract.md`：BFF API 合约摘要（鉴权/错误码/分页/幂等/端点）

## 产品/架构（来自 clawcare.md 的核心概念）

- **定位与边界**：ClawCare 是运维面板；不负责 OpenClaw 安装；默认本地打开
- **架构原则**：UI 不直连 Gateway；由 BFF 统一承担鉴权、脱敏、审计、策略与中继
- **能力模块**：Runs/Tasks、Ops、自检与诊断包、Config Center（diff/回滚）、Memory、Security & Audit、Safe Mode

## 代码侧参考

- `app/api/*`：BFF API 入口（Route Handlers）
- `app/_components/*`：页面壳与导航
- `app/(pages)/*`：顶级页面（home/connect/tasks/ops/config/memory/security）

> 建议后续补充：部署指南、RBAC/鉴权实现细节、审计日志 schema、配置与备份格式。
