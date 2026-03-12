# ClawCare 项目状态

更新时间（UTC）：2026-03-12

## 已完成（M1）
- Auth/Session
- RBAC（admin/viewer）
- Safe Mode（阻断高危操作）
- Policy deny 审计（best-effort）
- /login + /api/auth/login/logout
- 单测 + E2E 合约测试（全绿）

对应文档：
- `docs/FEATURES_M1.md`
- `docs/TEST_REPORT_M1.md`

## 进行中（M2：Runs/Tasks 最小闭环）
目标：把“运维动作”从一次性 API 调用升级为可追踪的 Run/Task：
- 能创建一次 run（任务执行记录）
- 能查看 run 状态（pending/running/succeeded/failed）
- 能产出 artifacts（日志、诊断包路径/下载信息）
- RBAC + Safe Mode 继续覆盖 runs/tasks 的创建/执行

初步范围（中庸拍板，最小可上线闭环）：
- 数据模型：Run（id、type、status、requestedBy、createdAt、startedAt、endedAt、result、auditRef）
- API：
  - `POST /api/runs` 创建 run
  - `GET /api/runs` 列表
  - `GET /api/runs/:id` 详情
- UI：
  - Runs 列表页 + 详情页
- 执行器：先使用“内置 mock 执行器”（setTimeout 模拟），后续再接真实 OpenClaw Gateway/Host Ops。

## 上线定义（阶段性）
M1 阶段：属于“安全基线完成”，尚未达到“完整可用的任务闭环”。
M2 达成后：具备最小闭环 + 可审计 + 可验收，即可作为 v0 上线。
