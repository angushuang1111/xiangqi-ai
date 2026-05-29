# Xiangqi v29 — Switch Account + Logout to Main Screen

Frontend: static files for Netlify.  
Backend: FastAPI for Render or local Python.

## New in v29

- Added a **Switch Account** button in the in-game user strip.
- Logout and Switch Account now return directly to the main login / visitor screen.
- Logout no longer leaves the old `Logged in: ...` badge visible.
- Supabase logout uses stronger session clearing and immediately resets UI state.
- Match history / replay records are preserved.

## Existing features kept

- Supabase email login / sign up.
- Forgot password / reset password.
- Visitor mode with local replay/history.
- Logged-in cloud match history and replay storage.
- Replay Center with clean separate page layout.
- Surrender / New Game replay saving checks.
- Pikafish Master mode backend.
- Live Battle + Chat / Quick Match.

## Render backend

Use these settings:

- Root Directory: `backend`
- Build Command: `bash build.sh`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Python version: `.python-version` contains `3.11.9`

## Netlify

Redeploy this folder to update the frontend.
