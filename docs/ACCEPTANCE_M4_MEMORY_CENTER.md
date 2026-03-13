# M4 验收 — Memory Center（记忆中心）

更新时间：2026-03-13（UTC）

目标：提供**可执行、可复现**的证据链，证明 Memory Center v0 具备：
- 记忆列表 / 详情查看 / 搜索（viewer+）
- 删除 / 裁剪（admin+confirm），且 Safe Mode 下强制阻断
- 基础脱敏（token/secret）输出
- 审计 best-effort 记录（允许/拒绝均应尽量写审计）

> 说明：当前实现为 file-based store（`data/memory/*`），适配 v0 单机形态。

---

## 0. 前置条件

```bash
pnpm install
pnpm dev
```

- 服务地址：`http://localhost:3000`
- DEV 登录旁路：OTP 使用 `DEV-BYPASS`

准备：
```bash
export BASE=http://localhost:3000
export COOKIE=/tmp/cc.cookie
curl -sS -c $COOKIE -H 'content-type: application/json' \
  -d '{"otp":"DEV-BYPASS","user_id":"local-admin"}' \
  $BASE/api/auth/login | jq
```

---

## 1) 列表 + 搜索（viewer+）

```bash
# 列表
curl -sS -b $COOKIE "$BASE/api/memory?limit=20" | jq

# 搜索（substring）
curl -sS -b $COOKIE "$BASE/api/memory?query=token&limit=20" | jq
```

验收点：
- 未登录访问应 401/403
- 登录（viewer/admin）后返回 `items/total/next_offset`

---

## 2) 详情（viewer+）

从列表中拿到任意 `id`（例如 `fixtures.json`），查看详情：

```bash
curl -sS -b $COOKIE "$BASE/api/memory/fixtures.json" | jq
```

验收点：
- 返回包含 `content` 字段
- 如果内容超过上限，应出现截断标记（truncated）

---

## 3) 脱敏（必须）

在 `data/memory/` 放入包含敏感串的文件（例如包含 `sk-...` / `Bearer ...`），再请求列表/详情：

验收点：
- 返回内容中敏感串应被替换为 `[REDACTED]`

---

## 4) 删除（admin+confirm；Safe Mode 阻断）

### 4.1 非 Safe Mode：admin 可以删（需要 confirm）

```bash
# 需要 confirm=true，否则应拒绝（409）
curl -sS -b $COOKIE -X DELETE "$BASE/api/memory/fixtures.json" \
  -H 'content-type: application/json' \
  -d '{"reason":"acceptance","confirm":true}' | jq
```

> 注意：`fixtures.json` 是测试夹具，不建议在真实仓库里删。

### 4.2 Safe Mode：必须阻断（403/409）

```bash
# 打开 safe mode
curl -sS -b $COOKIE -X POST "$BASE/api/ops/safe_mode" \
  -H 'content-type: application/json' \
  -d '{"enabled":true,"reason":"acceptance"}' | jq

# 尝试删除（必须失败）
curl -sS -b $COOKIE -X DELETE "$BASE/api/memory/fixtures.json" \
  -H 'content-type: application/json' \
  -d '{"reason":"acceptance","confirm":true}' | jq

# 关闭 safe mode
curl -sS -b $COOKIE -X POST "$BASE/api/ops/safe_mode" \
  -H 'content-type: application/json' \
  -d '{"enabled":false,"reason":"acceptance"}' | jq
```

---

## 5) UI 冒烟

- 登录后访问：`/memory`
- 搜索框输入关键词（例如 `token`）
- 点击任一条进入详情页：`/memory/<id>`

---

## 6) 自动化测试证据

- `pnpm test`（覆盖 RBAC/confirm/Safe Mode/脱敏/搜索）
- `pnpm test:e2e`（包含 /memory 冒烟 + Safe Mode delete 阻断）
