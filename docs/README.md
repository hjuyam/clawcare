# ClawCare Docs

开发者/验收文档导航（IA）。

## 快速入口
- `USAGE_GUIDE.md`：UI 步骤 + curl 示例（建议从这里开始）
- `BOUNDARIES_AND_GOTCHAS.md`：边界/限制/哪些是 mock
- `STATUS.md`：里程碑状态（M1/M2/M3/M4）

## API
- `api-contract.md`：BFF API 合约摘要（鉴权/错误码/分页/幂等/端点）

## 验收与测试
- `acceptance-m1-security.md`：M1 安全验收口径
- `ACCEPTANCE_M3_CONFIG_CENTER.md`：M3 配置中心验收脚本与证据链
- `TEST_REPORT_M1.md` / `TEST_REPORT_M2.md`：测试报告

## 产品/架构（概念）
- 定位与边界：ClawCare 是运维面板；不负责 OpenClaw 安装；UI 不直连 Gateway
- 架构原则：BFF 统一承担鉴权、脱敏、审计、策略与中继
- 能力模块：Runs/Tasks、Ops、自检与诊断包、Config Center（diff/回滚）、Memory、Security & Audit、Safe Mode

## 代码侧参考
- `app/api/*`：BFF API 入口（Route Handlers）
- `app/_components/*`：页面壳与导航
- `app/(pages)/*`：顶级页面（home/connect/tasks/ops/config/memory/security）
