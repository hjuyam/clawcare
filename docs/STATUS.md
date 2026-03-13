# ClawCare 项目状态

更新时间（UTC）：2026-03-13

## 快速入口
- 用户手册（v0）：[`docs/USER_MANUAL.md`](./USER_MANUAL.md)
- 使用指南（UI + API）：[`docs/USAGE_GUIDE.md`](./USAGE_GUIDE.md)
- 视频讲解脚本（5~8 分钟）：[`docs/VIDEO_WALKTHROUGH_SCRIPT.md`](./VIDEO_WALKTHROUGH_SCRIPT.md)
- 边界与注意事项（不要过度承诺）：[`docs/BOUNDARIES_AND_GOTCHAS.md`](./BOUNDARIES_AND_GOTCHAS.md)
- 安全验收口径（M1）：[`docs/acceptance-m1-security.md`](./acceptance-m1-security.md)

---

## 已完成（M1：安全基线）
- Auth/Session
- RBAC（admin/operator/viewer）
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

## 已完成（M3：Config Center）✅（可验收）
- Config Center：配置编辑（Draft JSON）→ Diff 预览（mask）→ Apply（带 confirm gate）→ 可回滚
- apply/rollback 以 **Run** 形式执行（可追踪 + 可审计），并已具备 **真实落盘语义**：
  - `data/manifest.json` 的 `currentVersion` 推进/回退
  - `data/snapshots/<version>.json` 写入/复用
  - `base_version` 乐观锁校验，避免覆盖
  - rollback 支持选择目标版本（UI 可选 + API `target_version`）
- 自动化测试覆盖：apply/rollback 落盘、base_version mismatch、失败分支
- **验收脚本与证据链**：`docs/ACCEPTANCE_M3_CONFIG_CENTER.md`

M3.1（审计可视化增强，已落地 MVP）：
- `/security` 提供只读审计视图（可筛选 action/actor/time，并可链接到 runs）

## M4（Memory Center）✅（可验收）
- Memory Center：记忆列表 / 详情查看 / substring 搜索（viewer+）
- 删除 / 裁剪：admin + confirm gate，且 Safe Mode 下强制阻断
- 输出脱敏：基础 token/secret 规则替换为 `[REDACTED]`
- 证据链：`docs/ACCEPTANCE_M4_MEMORY_CENTER.md`

## 上线定义（阶段性）
- M1：安全基线完成，但尚未达到完整可用闭环
- M2：最小闭环可验收，可作为 v0 上线
- M3/M4：增强阶段（配置/记忆中心），以“可回滚+可审计”为主轴
