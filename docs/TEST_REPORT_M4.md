# TEST_REPORT_M4 — Memory Center (M4)

Date: 2026-03-13 (UTC)

Env:
- dev server: `DEV_BYPASS=1 pnpm dev` (http://localhost:3000)
- auth: `otp=DEV-BYPASS`, `user_id=local-admin`
- Safe Mode: toggled by writing `data/safe_mode.json` (no API route present)

## 1) List + Search (viewer+)

**Command**
```bash
export BASE=http://localhost:3000
export COOKIE=/tmp/cc.cookie
curl -sS -c $COOKIE -H 'content-type: application/json' \
  -d '{"otp":"DEV-BYPASS","user_id":"local-admin"}' \
  $BASE/api/auth/login | jq

curl -sS -b $COOKIE "$BASE/api/memory?limit=20" | jq
curl -sS -b $COOKIE "$BASE/api/memory?query=token&limit=20" | jq
```

**Expected**
- returns `items/total/next_offset`

**Actual (snippet)**
```json
{
  "items": [
    {
      "id": "fixtures.json",
      "filename": "fixtures.json",
      "size": 1043,
      "preview": "[\n  {\n    \"id\": \"mem-2026-03-13-001\"..."
    }
  ],
  "total": 1,
  "next_offset": null
}
```

## 2) Detail (viewer+)

**Command**
```bash
curl -sS -b $COOKIE "$BASE/api/memory/fixtures.json" | jq
```

**Expected**
- includes `content`

**Actual (snippet)**
```json
{
  "item": {
    "id": "fixtures.json",
    "content": "[\n  {\n    \"id\": \"mem-2026-03-13-001\"..."
  }
}
```

## 3) Redaction (token/secret)

**Command**
```bash
cat > data/memory/redact.json <<'EOF'
{
  "id": "mem-redact-001",
  "time": "2026-03-13T12:00:00Z",
  "source": "test",
  "title": "Contains secret",
  "content": "token=sk-SECRET-123 and Bearer abcdef"
}
EOF

curl -sS -b $COOKIE "$BASE/api/memory/redact.json" | jq
```

**Expected**
- secrets replaced with `[REDACTED]`

**Actual (snippet)**
```json
{
  "item": {
    "id": "redact.json",
    "content": "{\n  ... \"content\": \"token=[REDACTED] and Bearer abcdef\"\n}"
  }
}
```

## 4) Delete (admin+confirm; Safe Mode blocks)

### 4.1 Non-safe-mode delete

**Command**
```bash
curl -sS -b $COOKIE -X DELETE "$BASE/api/memory/fixtures.json" \
  -H 'content-type: application/json' \
  -d '{"reason":"acceptance","confirm":true}' | jq
```

**Expected**
- status ok

**Actual (snippet)**
```json
{ "status": "ok" }
```

> Note: `fixtures.json` restored after delete to keep repo fixtures.

### 4.2 Safe Mode block

**Command** (Safe Mode enabled by writing file):
```bash
cat > data/safe_mode.json <<'EOF'
{ "enabled": true, "reason": "acceptance" }
EOF

curl -sS -b $COOKIE -X DELETE "$BASE/api/memory/fixtures.json" \
  -H 'content-type: application/json' \
  -d '{"reason":"acceptance","confirm":true}' | jq
```

**Expected**
- `POLICY_DENIED`

**Actual (snippet)**
```json
{
  "error": {
    "code": "POLICY_DENIED",
    "message": "Safe mode enabled"
  }
}
```

## 5) Automated tests (reference)
- `pnpm test` ✅
- `pnpm test:e2e` ❌ (see QA notes)
