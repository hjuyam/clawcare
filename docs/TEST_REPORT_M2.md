# ClawCare — M2（Runs/Tasks 最小闭环）测试报告

生成时间（UTC）：2026-03-12

## 变更范围
M2 最小闭环在 M1 安全基线之上新增：
- Runs API：创建 / 列表 / 详情
- Runs 存储：`data/runs.json`（文件持久化，best-effort）
- Runs UI：`/tasks` 列表页 + `/tasks/[id]` 详情页
- RBAC：viewer 允许 low-risk run；high-risk run 需 admin
- Safe Mode：对 high-risk run 创建进行阻断

## 单元测试（Vitest）
命令：
- `npm test`

结果摘要：
- Test Files: 7 passed
- Tests: 15 passed

新增覆盖：
- `app/api/runs/__tests__/runs.test.ts`
  - viewer 可 list
  - viewer 可创建 low-risk run（例如 `ops.self_check`）
  - viewer 创建 high-risk run（例如 `ops.cleanup`）会 403

## 端到端测试（Playwright）
命令：
- `npm run test:e2e`

结果摘要：
- 8 passed

说明：
- 当前 E2E 仍以 M1 安全合约为主；M2 的 runs UI/E2E 在下一迭代补齐（避免一次性把合约面拉太大）。

## 结论
- M2 最小闭环已具备“可创建 run + 可查看列表/详情 + 文件持久化 + RBAC 覆盖”的可验收能力。
