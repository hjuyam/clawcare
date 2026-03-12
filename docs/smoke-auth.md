# Smoke test: Auth + runs/ops APIs

This project protects API routes with a signed session cookie: `clawcare_session`.

## Option A (recommended for local dev): DEV_BYPASS

This is the fastest way to validate the end-to-end path.

### 1) Start dev server

```bash
export PORT=3005
export DEV_BYPASS=1
npm run dev
```

### 2) Login (returns Set-Cookie)

```bash
curl -i -X POST "http://127.0.0.1:${PORT}/api/auth/login" \
  -H 'content-type: application/json' \
  --data '{"otp":"DEV-BYPASS"}'
```

### 3) Call a protected API with the cookie

```bash
COOKIE=$(curl -sS -i -X POST "http://127.0.0.1:${PORT}/api/auth/login" \
  -H 'content-type: application/json' \
  --data '{"otp":"DEV-BYPASS"}' \
  | tr -d '\r' | awk -F': ' 'tolower($1)=="set-cookie"{print $2}' | head -n1 | cut -d';' -f1)

echo "cookie=$COOKIE"

curl -sS -i "http://127.0.0.1:${PORT}/api/runs" \
  -H "cookie: $COOKIE" | head -n 40
```

Expected: HTTP 200 + JSON body.

## Option B (production-like): real TOTP

`POST /api/auth/login` validates the provided OTP against the configured user's `totp_secret`.

User records are loaded from:

- `data/users.json` if present, else
- env fallback:
  - `AUTH_USER_ID` (default `local-admin`)
  - `AUTH_ROLE` (default `admin`)
  - `TOTP_SECRET` (**required** for real OTP)

### Minimal env setup

```bash
export PORT=3005
export TOTP_SECRET='<base32-totp-secret>'
# optional:
export AUTH_USER_ID='local-admin'
export AUTH_ROLE='admin'

npm run dev
```

Then send a current TOTP code:

```bash
curl -i -X POST "http://127.0.0.1:${PORT}/api/auth/login" \
  -H 'content-type: application/json' \
  --data '{"otp":"123456"}'
```

## Notes

- Session cookie is signed using `SESSION_SECRET` (dev default: `dev-session-secret`).
- TTL is 12h.
