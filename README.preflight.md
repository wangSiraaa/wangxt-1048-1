# Trae Preflight

This folder is prepared for `wangxt-1048-1`.

Use `.env` for stable local ports and compose project identity:

- APP_PORT: 18348
- API_PORT: 19348
- WEB_PORT: 20348
- DB_PORT: 21348
- REDIS_PORT: 22348

Smoke entry:

```bash
bash scripts/smoke.sh
```

The preflight files are environment scaffolding only. The generated business
project can replace or extend them when needed.
