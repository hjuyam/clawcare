# ClawCare — M1 测试报告

生成时间（UTC）：2026-03-12

## 范围
M1 目标：Auth/Session、RBAC（admin/viewer）、Safe Mode、高危操作策略拒绝（Policy deny）审计能力，以及对应的单测与 E2E 合约测试。

## 单元测试（Vitest）
命令：
- `npm test`

结果摘要：
- Test Files: 6 passed
- Tests: 12 passed

覆盖点（按测试文件）：
- `app/api/ops/__tests__/restart_gateway.test.ts`
- `app/api/config/__tests__/safe_mode.test.ts`
- `app/api/ops/__tests__/cleanup.test.ts`
- `tests/security/policy.test.ts`
- `app/api/ops/__tests__/self_check.test.ts`
- `app/api/ops/__tests__/diagnostics_bundle.test.ts`

## 端到端测试（Playwright）
命令：
- `npm run test:e2e`

结果摘要：
- 8 passed

覆盖点（按 spec）：
- `tests/e2e/core-pages.spec.ts`：核心页面与 mock 网关联通（home / ops self_check / config / security audit 占位）
- `tests/e2e/security-m1.spec.ts`：M1 安全合约
  - 未登录访问拒绝
  - viewer 无法执行高危 ops
  - admin 可执行高危 ops
  - Safe Mode 下 admin 的高危 ops 被阻断

## 结论
- M1 测试全绿，可作为进入 M2（Runs/Tasks 最小闭环）的稳定基线。
