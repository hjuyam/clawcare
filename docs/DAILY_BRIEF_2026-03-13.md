# ClawCare Daily Brief — 2026-03-13 (UTC)

> 范围：接下来 24 小时（2026-03-13 00:00 ~ 2026-03-13 24:00 UTC）
> 
> 基线对齐：见 `docs/PM_PLAN_2026-03-12.md` 与 `docs/STATUS.md`（均更新于 2026-03-12）。

---

## 今日目标（M3 解卡：真实落盘语义）

把 **M3 Config Center** 从“UI/API 能触发 apply/rollback（创建 run）”推进到“**apply/rollback 会真实落盘 + 推进/回退 current_version + 可追溯（audit）+ 可回滚（manifest/snapshot 一致）**”。

**一句话验收定义（今日结束前应成立）**：
- 在本地跑通：`apply(confirm=true)` 后 `GET /api/config/current` 的 `current_version` 前进；随后 `rollback(confirm=true, target_version=xxx)` 后 `current_version` 回到目标版本，且 `data/manifest.json` + `data/snapshots/*.json` 与返回内容一致（并写入审计）。

---

## 并行任务分配（coder / tester / writer / timer）

### 1) coder（主战场：PR-2）
**任务**：补齐 M3 核心语义：apply/rollback 真正落盘（snapshot/manifest），并支持按 `target_version` 回滚。

**建议切片（避免一次性改太大）**：
- (A) apply 落盘：auto-snapshot before apply → 写入新 snapshot → 更新 manifest.currentVersion
- (B) 乐观锁：`base_version` 不匹配 → 409（避免并发覆盖）
- (C) rollback：按 `target_version` 回滚并更新 manifest.currentVersion（是否生成新版本条目见“风险/需决策”）
- (D) 审计：apply/rollback 成功与拒绝路径均 best-effort 写入 audit event

### 2) tester（护航：单测 + 最小 E2E 稳定）
**任务**：补齐/加固单测，确保“版本推进/回滚 + 文件落盘一致性 + safe mode/confirm gate”可被自动验证。

**目标**：把今日 M3 的退出条件变成 **可跑的测试**，减少“看 UI 感觉对”的不确定性。

### 3) writer（对外可读：验收文档 + STATUS 对齐）
**任务**：把 M3 的“可验收口径”写成一页文档，并更新 `docs/STATUS.md` 的 M3 章节：已具备/缺口/今日完成项。

### 4) timer（节奏与升级：不靠催）
**任务**：按 PM Plan 固定节奏触发两次同步窗口，并在触发升级条件时提醒 main：
- 09:30 UTC：昨日合入/今日计划/阻塞点
- 19:30 UTC：当日产出/未达预期原因/下一步

---

## 每个任务的验收标准（命令 + 预期）

> 说明：下面每条都尽量给出“可执行命令 + 预期现象”。若某条暂时无法端到端执行，至少要有单测或可复现的手工步骤。

### coder — PR-2（M3 真实落盘语义）

**AC-2.1 单测全绿（回归门槛）**
- 命令：
  - `npm test`
- 预期：
  - 退出码 0
  - 关键用例覆盖：confirm gate / safe mode deny / apply 成功推进版本 / rollback 回退版本

**AC-2.2 apply 后版本推进**
- 命令（手工路径，建议用 curl；如项目已有 helper 可替换）：
  1) `npm run dev`
  2) `curl -s http://localhost:3000/api/config/current | jq .current_version`
  3) `curl -s -X POST http://localhost:3000/api/config/apply \
        -H 'content-type: application/json' \
        -d '{"confirm":true,"base_version":<上一步的current_version>,"config":{...}}' | jq .run_id`
  4) 再次 `curl -s http://localhost:3000/api/config/current | jq .current_version`
- 预期：
  - 第 4 步的 `current_version` 与第 2 步不同（前进）
  - 返回的 `run_id` 可在 `/tasks` 中查到记录（type=`config.apply`）

**AC-2.3 rollback 到目标版本**
- 命令：
  - `curl -s http://localhost:3000/api/config/versions | jq '.entries[0:5] | map(.version)'
  - 选择一个历史 `target_version`，执行：
    - `curl -s -X POST http://localhost:3000/api/config/rollback \
        -H 'content-type: application/json' \
        -d '{"confirm":true,"target_version":<target_version>}' | jq .run_id`
  - 再次：`curl -s http://localhost:3000/api/config/current | jq .current_version`
- 预期：
  - `current_version == target_version`（或如果设计为“回滚生成新版本”，则必须有明确字段表明 current 指向回滚产物，并能追溯 target）

**AC-2.4 落盘一致性（manifest + snapshots）**
- 命令：
  - `cat data/manifest.json | jq .currentVersion`
  - `ls -la data/snapshots | tail`
- 预期：
  - `manifest.currentVersion` 与 `/api/config/current.current_version` 一致
  - apply 路径至少新增 1 个 snapshot 文件；且 `versions` 中能追溯其 hash/time

---

### tester — 单测补齐（优先）+ E2E 稳定（次要但建议）

**AC-T1 覆盖“版本推进/回滚”核心语义的测试存在且稳定**
- 命令：
  - `npm test`
- 预期：
  - 新增/更新的测试文件能断言：
    - apply：生成 snapshot + 更新 manifest + current_version 前进
    - rollback：current_version 回到目标（或符合约定语义）
    - 并发/乐观锁：base_version 不匹配时 409

**AC-T2 Safe Mode 与 confirm gate 的拒绝路径可证明**
- 命令：
  - `npm test`
- 预期：
  - 断言返回结构化 error（例如 `code=CONFIRM_REQUIRED` / `code=SAFE_MODE_DENY`）
  - 拒绝时仍 best-effort 写入 audit（若有 audit 读取 API 则更好；否则至少断言 writer 被调用或文件追加）

**AC-T3（可选）E2E 冒烟不 flake**
- 命令：
  - `npm run test:e2e`
- 预期：
  - `/config` 的 preview/apply/rollback 冒烟用例稳定通过；selectors 不依赖易变文案

---

### writer — 验收文档 + STATUS 对齐

**AC-W1 M3 验收文档落地**
- 目标产物：`docs/acceptance-m3-config.md`（或等价文件名）
- 内容必须包含：
  - 今日最终口径（apply/rollback 落盘语义）
  - 关键 API 请求/响应示例（含 confirm/safe mode/409）
  - 一套“从 0 到验收”的步骤（命令 + 预期）

**AC-W2 更新 `docs/STATUS.md`**
- 预期：
  - M3 章节从“雏形”更新为“已落盘版本推进（若完成）/ 仍缺哪些（若未完成）”
  - 明确下一步：E2E 合约与 UI 选择目标版本（PR-1/PR-3）

---

### timer — 节奏执行（两次同步窗口）

**AC-R1 09:30 UTC 与 19:30 UTC 两次同步窗口按模板产出**
- 预期：
  - 每次同步包含：Done / In Progress / Next / Risks / Metrics（`npm test`、`npm run test:e2e`、`npm run build`）

---

## 风险与升级规则（24h 版）

### 关键风险（今天主要盯 3 个）
1) **回滚语义不明确**（是否生成新版本条目？current_version 如何表达？）
   - 影响：实现与测试/文档无法对齐，容易返工
   - 缓解：在 coder 开工前先固定“回滚语义决策”（见下）
2) **文件落盘一致性/并发**（manifest 与 snapshots 写入竞态，导致 current 指针错乱）
   - 影响：数据损坏/回滚失败
   - 缓解：乐观锁（base_version）+ 原子写（临时文件 rename）+ 单测覆盖
3) **E2E flake 拉低节奏**
   - 影响：CI 红且耗时定位
   - 缓解：今日优先保证单测覆盖语义；E2E 仅做冒烟，选择器走 data-testid

### 需要 main/PM 快速拍板的“语义决策”（若未在代码中既定）
- **D1：rollback 是否产生“新版本”条目？**
  - 方案 A（推荐 v0）：rollback **不产生新 snapshot**，只把 `manifest.currentVersion` 指向历史版本；审计记录 target_version。
    - 优点：实现简单、风险低
    - 缺点：版本列表不体现“回滚动作”本身（需靠 audit/run 追溯）
  - 方案 B：rollback 产生一个新版本（内容等于 target），并把 current 指向新版本；同时记录 rollback_from/rollback_to。
    - 优点：版本时间线完整
    - 缺点：实现更复杂、测试更多

### 升级规则（触发就立即同步 main）
- **P0（立即升级）**
  - 出现安全回归：viewer 能 apply/rollback、或 safe mode 仍能写入
  - 出现数据损坏风险：manifest/snapshots 写坏导致服务启动失败或 current_version 读不出
  - `npm run build` 持续失败（>30 分钟）
- **P1（2 小时内升级）**
  - 回滚语义 D1 无法确定，导致 coder/tester/writer 三方产出无法对齐
  - E2E 连续 flake 且 2 小时内无法稳定
- **P2（下次同步窗口说明即可）**
  - 文案/UI 微调、非阻塞重构

升级时必须给出：
1) 现象（含失败命令/日志片段）
2) 影响面（安全/数据/进度）
3) 两个备选方案（成本+风险）

---

## 今日建议的“最小成功路径”（避免摊大饼）

1) 先定 D1（回滚语义）→ coder 按此实现
2) tester 先补齐单测（语义可证明）→ 再考虑 E2E 稳定
3) writer 同步产出 acceptance doc（把“可验收”写死）
4) timer 按节奏汇报 metrics，发现 P0/P1 立即升级
