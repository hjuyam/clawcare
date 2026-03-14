# TEST_REPORT_M3 — Config Center (M3)

Date: 2026-03-13 (UTC)

Env:
- dev server: `DEV_BYPASS=1 pnpm dev` (http://localhost:3000)
- auth: `otp=DEV-BYPASS`, `user_id=local-admin`
- Safe Mode: **disabled** via `data/safe_mode.json`

## 1) apply: real persistence + runs tracking

**Command**
```bash
export BASE=http://localhost:3000
export COOKIE=/tmp/cc.cookie
curl -sS -c $COOKIE -H 'content-type: application/json' \
  -d '{"otp":"DEV-BYPASS","user_id":"local-admin"}' \
  $BASE/api/auth/login | jq

CUR=$(curl -sS -b $COOKIE $BASE/api/config/current | jq -r .current_version)

APPLY=$(curl -sS -b $COOKIE -H 'content-type: application/json' \
  -d "{\"config\":{\"featureFlag\":true,\"nested\":{\"threshold\":7}},\"base_version\":\"$CUR\",\"author\":\"cli\",\"reason\":\"apply\",\"confirm\":true}" \
  $BASE/api/config/apply | jq -r .run_id)

curl -sS -b $COOKIE $BASE/api/runs/$APPLY | jq

jq -r '.currentVersion,.entries[-1].file' data/manifest.json
jq -r . data/snapshots/$(jq -r '.entries[-1].file' data/manifest.json)
```

**Expected**
- `/api/runs/<id>` status = `succeeded`
- `manifest.currentVersion` advances
- snapshot contains applied config

**Actual (snippets)**
```json
// /api/runs/<id>
{
  "run": {
    "type": "config.apply",
    "status": "succeeded",
    "result": {
      "before": "v41",
      "after": "v42"
    }
  }
}
```
```text
// manifest check
v42
v42.json
```
```json
// snapshot content
{
  "featureFlag": true,
  "nested": { "threshold": 7 }
}
```

## 2) base_version mismatch: fail + no persistence

**Command**
```bash
BAD=$(curl -sS -b $COOKIE -H 'content-type: application/json' \
  -d '{"config":{"featureFlag":false},"base_version":"v999","author":"cli","reason":"apply","confirm":true}' \
  $BASE/api/config/apply | jq -r .run_id)

curl -sS -b $COOKIE $BASE/api/runs/$BAD | jq
jq -r .currentVersion data/manifest.json
```

**Expected**
- run `status=failed`
- manifest `currentVersion` unchanged

**Actual (snippets)**
```json
{
  "run": {
    "status": "failed",
    "error": {
      "code": "BASE_VERSION_MISMATCH"
    }
  }
}
```
```text
v42
```

## 3) rollback: stable revert, no new entry

**Command**
```bash
RB=$(curl -sS -b $COOKIE -H 'content-type: application/json' \
  -d "{\"target_version\":\"$CUR\",\"author\":\"cli\",\"reason\":\"rollback\",\"confirm\":true}" \
  $BASE/api/config/rollback | jq -r .run_id)

curl -sS -b $COOKIE $BASE/api/runs/$RB | jq
jq -r '.currentVersion,.entries|length' data/manifest.json
```

**Expected**
- run `status=succeeded`
- `currentVersion` returns to `CUR`
- entries length unchanged (rollback does not create new version)

**Actual (snippets)**
```json
{
  "run": {
    "type": "config.rollback",
    "status": "succeeded",
    "result": {
      "before": "v42",
      "after": "v41"
    }
  }
}
```
```text
3
42
```

## 4) Automated tests (reference)
- `pnpm test` ✅
- `pnpm test:e2e` ❌ (see summary in QA notes)
