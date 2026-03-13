# M3 验收 — Config Center（配置中心）

更新时间：2026-03-13（UTC）

本验收文档的目标：提供**可复现、可执行**的证据链，证明 M3 Config Center 具备：
- apply / rollback 的真实落盘语义（manifest + snapshots）
- base_version 乐观锁（避免覆盖）
- Runs 追踪（可在 /tasks 查看）

> 说明：本文档面向“验收/复现”，不替代产品说明文档（见 `docs/M3_CONFIG_CENTER.md`）。

---

## 0. 前置条件

- Node / pnpm 已安装
- 项目已安装依赖：`pnpm install`
- 启动 dev：

```bash
pnpm dev
```

- 默认假设服务在：`http://localhost:3000`
- 开启 DEV 登录旁路（用于本地验收）：OTP 使用 `DEV-BYPASS`

---

## 1) apply：真实落盘 + Runs 可追踪

```bash
export BASE=http://localhost:3000
export COOKIE=/tmp/cc.cookie

# login
curl -sS -c $COOKIE -H 'content-type: application/json' \
  -d '{"otp":"DEV-BYPASS","user_id":"local-admin"}' \
  $BASE/api/auth/login | jq

# capture current version
CUR=$(curl -sS -b $COOKIE $BASE/api/config/current | jq -r .current_version)

# apply config with base_version
APPLY=$(curl -sS -b $COOKIE -H 'content-type: application/json' \
  -d "{\"config\":{\"featureFlag\":true,\"nested\":{\"threshold\":7}},\"base_version\":\"$CUR\",\"author\":\"cli\",\"reason\":\"apply\",\"confirm\":true}" \
  $BASE/api/config/apply | jq -r .run_id)

# run should succeed
curl -sS -b $COOKIE $BASE/api/runs/$APPLY | jq '.run.status,.run.result'

# verify manifest & snapshot updated (disk persistence)
jq -r '.currentVersion,.entries[-1].file' data/manifest.json
jq -r . data/snapshots/$(jq -r '.entries[-1].file' data/manifest.json)
```

验收点：
- `/api/runs/<id>` 中 `status` 为 `succeeded`
- `data/manifest.json` 的 `currentVersion` 已变化
- `data/snapshots/<file>.json` 内容包含刚刚 apply 的 config（featureFlag + nested.threshold）

---

## 2) base_version mismatch：必须失败且不落盘

```bash
# base_version mismatch should fail and NOT change manifest
BAD=$(curl -sS -b $COOKIE -H 'content-type: application/json' \
  -d '{"config":{"featureFlag":false},"base_version":"v999","author":"cli","reason":"apply","confirm":true}' \
  $BASE/api/config/apply | jq -r .run_id)

curl -sS -b $COOKIE $BASE/api/runs/$BAD | jq '.run.status,.run.error'

# manifest currentVersion should remain unchanged
jq -r .currentVersion data/manifest.json
```

验收点：
- 该 run `status` 为 `failed`
- manifest 的 `currentVersion` 不变
- entries 长度不增长（可选，见单测覆盖）

---

## 3) rollback：稳定回滚（不新增 entry）

```bash
# rollback to previous version (CUR), no new entry
RB=$(curl -sS -b $COOKIE -H 'content-type: application/json' \
  -d "{\"target_version\":\"$CUR\",\"author\":\"cli\",\"reason\":\"rollback\",\"confirm\":true}" \
  $BASE/api/config/rollback | jq -r .run_id)

curl -sS -b $COOKIE $BASE/api/runs/$RB | jq '.run.status,.run.result'

jq -r '.currentVersion,.entries|length' data/manifest.json
```

验收点：
- run `status` 为 `succeeded`
- `currentVersion` 回到 `CUR`
- entries 数量不增加（rollback 不创建新版本）

---

## 4) 自动化测试证据

- Unit tests：
  - `pnpm test`（覆盖 apply/rollback 落盘与 base_version 乐观锁）
- E2E（Playwright）smoke：
  - `pnpm test:e2e`（包含 core pages + /tasks 冒烟）
