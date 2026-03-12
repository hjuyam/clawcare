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

## 已完成（M2：Runs/Tasks 最小闭环）
结论：已具备“可创建 run + 可查看列表/详情 + 文件持久化 + RBAC/Safe Mode 覆盖”的可验收能力。
- Runs API：创建 / 列表 / 详情
- Runs 存储：`data/runs.json`（文件持久化，best-effort）
- Runs UI：`/tasks` 列表页 + `/tasks/[id]` 详情页（轮询刷新状态）
- 执行器：内置 mock executor（best-effort timer）
- 审计：runs.create / runs.update best-effort 写入 audit log
- Diagnostics bundle：mock artifact 写入 `data/artifacts/` 并回传路径

待补齐（不影响 v0 最小闭环，但建议作为 M2.1）：
- Runs UI 的 E2E 合约（目前 E2E 仍以 M1 安全合约为主）

## 规划（M3）
- Config Center：配置编辑（备份→diff→应用→可回滚）+ 审计面板

## 规划（M4）
- Memory Center：记忆浏览/搜索/清理 + 安全护栏（Safe Mode 一致）

## 上线定义（阶段性）
- M1：安全基线完成，但尚未达到完整可用闭环
- M2：最小闭环可验收，可作为 v0 上线
- M3/M4：增强阶段（配置/记忆中心），以“可回滚+可审计”为主轴
