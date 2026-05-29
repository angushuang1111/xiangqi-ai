# Backend

FastAPI backend for Xiangqi AI and live battle.

## Render settings

- Root Directory: `backend`
- Build Command: `bash build.sh`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

## Pikafish

`build.sh` runs `install_pikafish.py`, which attempts to install Pikafish to:

```text
backend/vendor/pikafish/pikafish
```

You may override it with:

```text
PIKAFISH_PATH=/path/to/pikafish
```

Status endpoint:

```text
GET /api/engine-status
```


V14 note: build.sh downloads Pikafish plus pikafish.nnue, and engine.py sets EvalFile to the full NNUE path.
