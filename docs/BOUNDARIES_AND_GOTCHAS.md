# ClawCare 边界与注意事项（Boundaries & Gotchas）

本文用于**验收/对外沟通时的明确口径**：哪些能力是真实的、哪些是 mock、哪些场景不保证。

> 建议把本文当作“不要过度承诺”的清单。

相关：
- 使用指南：[`docs/USAGE_GUIDE.md`](./USAGE_GUIDE.md)
- 状态：[`docs/STATUS.md`](./STATUS.md)
- 安全模型：[`SECURITY.md`](../SECURITY.md)

---

## 1) 存储与一致性：文件落盘（best-effort）

当前数据多为本地文件存储：
- Runs：`data/runs.json`
- Audit：`data/audit/events.jsonl`
- Config：`data/manifest.json`、`data/snapshots/<version>.json`
- Artifacts：`data/artifacts/`

**含义**：
- 适合：本地开发、单实例 demo、可验收的最小闭环
- 不适合：多实例/水平扩展、serverless、强一致/强事务需求

**常见 gotchas**：
- 并发写：没有数据库级事务；高并发下可能出现覆盖/乱序（已尽量用乐观锁/最小化写入降低风险）
- 审计写入为 best-effort：失败时不应阻断主流程，但会造成审计缺口

---

## 2) 单实例假设（Single-instance by default）

默认假设：**一个进程 + 一个本地 data 目录**。

多实例时会遇到：
- 版本推进/回滚竞争（manifest/snapshots）
- runs 状态更新竞争
- audit 追加写竞争

若要走向多实例，需要：
- 共享存储与原子写策略（DB/队列/对象存储）
- 分布式锁或 CAS 语义
- 可观测性与幂等策略系统化

---

## 3) “Runs/Tasks” 的执行语义：目前以追踪为主，executor 为 mock

当前 Runs/Tasks 的核心价值是：
- 统一 run_id
- 状态机/输入输出/错误
- 审计关联
- 产物路径（artifacts）

但请明确：
- **executor 目前是 mock timer**（queued → running → succeeded/failed 的演示链路）
- 创建 `ops.*` / `config.*` run **不等于**真实触发 OpenClaw Gateway 或系统级动作

> Config Center 的 apply/rollback 有“真实落盘语义”（见下），但不等同于“真实执行引擎”。

---

## 4) Config Center：落盘是真实的，但仍受限制

已具备：
- `manifest.json` currentVersion 推进/回退
- snapshots 写入/复用
- `base_version` 乐观锁校验
- preview diff 对敏感字段 mask
- apply/rollback 纳入 Runs 并写入审计（best-effort）

限制/注意：
- mask 规则是“安全默认”的最小实现：可能存在未覆盖的敏感字段路径（请以 `SECURITY.md` 与代码实现为准）
- apply/rollback **必须 confirm**（confirm gate），否则应返回 `CONFIRM_REQUIRED`
- Safe Mode 开启时必须拒绝写入类操作

---

## 5) Safe Mode：是“保险丝”，不是权限系统的替代

Safe Mode 的设计目标是“故障期止血”：
- 允许只读查询
- 禁止有副作用的操作（尤其是配置变更、重启、清理、外发等）

注意：
- UI 的禁用/隐藏不是安全边界；最终以服务端 BFF 的拒绝为准
- Safe Mode 的判定与开关路径（以及是否有应急 bypass）必须在验收口径里说清楚

---

## 6) RBAC：当前为最小角色模型（admin / viewer）

当前 RBAC 仅覆盖最小场景：
- viewer：只读
- admin：可写（仍受 Safe Mode、confirm gate、policy 约束）

限制：
- 暂不包含细粒度权限（按资源/动作/范围的 policy）
- 暂不包含多租户隔离

---

## 7) 审计（Audit）：best-effort + “以日志为主”的阶段

当前审计目标是：
- allow/deny 尽量写入（best-effort）
- 对关键动作（login、config apply/rollback、runs create/update）有证据链

限制：
- 不保证每个动作都有审计记录（写入失败时不会阻断业务）
- 审计 UI 仍在增强中，部分字段可能缺失/不稳定

---

## 8) 不是 OpenClaw 安装器 / 不是公网暴露的 Gateway

必须清楚对外说明：
- ClawCare **不负责安装** OpenClaw / Gateway
- ClawCare 的核心安全原则之一是：**浏览器不直连 Gateway、不暴露 Gateway token**

---

## 9) 其他常见 gotchas

- **无 SSE/WS**：任务状态多依赖轮询（/tasks 详情页）
- **Artifacts 路径**：产物路径是“落盘路径/引用”，不是下载/分发系统
- **DEV 旁路**：为了本地联调可能存在 dev-only bypass（需确保只在 localhost/dev 生效，且文档明确）
