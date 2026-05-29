"""Install Pikafish during Render build.

This script is intentionally best-effort: if GitHub assets change or Render blocks
something, the web app still deploys and Master mode falls back to Expert.
"""
from __future__ import annotations

import json
import os
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VENDOR = ROOT / "vendor" / "pikafish"
TARGET = VENDOR / "pikafish"
NNUE = VENDOR / "pikafish.nnue"
NNUE_URL = "https://github.com/official-pikafish/Networks/releases/download/master-net/pikafish.nnue"
REPOS = [
    "official-pikafish/Pikafish",
    "PikaCat-OuO/Pikafish",
]

BAD_WORDS = ("windows", "win64", "win32", ".exe", "mac", "darwin", "apple", "android", "apk", "source")
GOOD_WORDS = ("linux", "ubuntu", "gnu", "x86_64", "x86-64", "amd64", "avx2", "bmi2", "modern")


def log(msg: str) -> None:
    print(f"[pikafish-install] {msg}", flush=True)


def urlopen_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "xiangqi-render-build"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def download(url: str, out: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "xiangqi-render-build"})
    with urllib.request.urlopen(req, timeout=90) as resp, out.open("wb") as f:
        shutil.copyfileobj(resp, f)


def score_asset(asset: dict) -> int:
    name = asset.get("name", "").lower()
    score = 0
    if not name.endswith((".zip", ".tar.gz", ".tgz", ".tar", ".7z")):
        score -= 30
    for w in GOOD_WORDS:
        if w in name:
            score += 15
    for w in BAD_WORDS:
        if w in name:
            score -= 80
    # Prefer normal archives over source tarballs.
    if "linux" in name or "ubuntu" in name:
        score += 60
    if "x86" in name or "amd64" in name:
        score += 40
    return score


def extract_archive(archive: Path, dst: Path) -> None:
    name = archive.name.lower()
    if name.endswith(".zip"):
        with zipfile.ZipFile(archive) as z:
            z.extractall(dst)
    elif name.endswith((".tar.gz", ".tgz", ".tar")):
        with tarfile.open(archive) as t:
            t.extractall(dst)
    else:
        raise RuntimeError(f"Unsupported archive: {archive.name}")


def candidate_executables(root: Path) -> list[Path]:
    candidates: list[Path] = []
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        lower = p.name.lower()
        if lower.endswith((".txt", ".md", ".nnue", ".json", ".dll", ".exe")):
            continue
        if "pikafish" in lower or lower in {"stockfish", "engine"}:
            try:
                p.chmod(p.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
            except Exception:
                pass
            candidates.append(p)
    candidates.sort(key=lambda x: x.stat().st_size if x.exists() else 0, reverse=True)
    return candidates


def copy_candidate(cand: Path) -> bool:
    VENDOR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(cand, TARGET)
    TARGET.chmod(TARGET.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    # Quick sanity check: a UCI engine should start and answer some text after uci.
    try:
        proc = subprocess.Popen([str(TARGET)], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        assert proc.stdin is not None and proc.stdout is not None
        proc.stdin.write("uci\nquit\n")
        proc.stdin.flush()
        out, err = proc.communicate(timeout=5)
        if "uciok" in out.lower() or "pikafish" in (out + err).lower():
            (VENDOR / "installed_path.txt").write_text(str(TARGET), encoding="utf-8")
            log(f"Installed Pikafish executable at {TARGET}")
            return True
        log(f"Candidate did not look like UCI engine: {cand.name}. Output: {(out + err)[:200]}")
    except Exception as exc:
        log(f"Candidate failed sanity check: {cand} ({exc})")
    try:
        TARGET.unlink(missing_ok=True)
    except Exception:
        pass
    return False


def install_from_release() -> bool:
    for repo in REPOS:
        api = f"https://api.github.com/repos/{repo}/releases/latest"
        try:
            data = urlopen_json(api)
        except Exception as exc:
            log(f"Could not fetch {api}: {exc}")
            continue
        assets = data.get("assets", [])
        if not assets:
            log(f"No release assets found for {repo}")
            continue
        assets = sorted(assets, key=score_asset, reverse=True)
        log("Assets by preference: " + ", ".join(a.get("name", "?") for a in assets[:5]))
        for asset in assets[:4]:
            url = asset.get("browser_download_url")
            name = asset.get("name", "asset")
            if not url:
                continue
            try:
                with tempfile.TemporaryDirectory() as td:
                    td_path = Path(td)
                    archive = td_path / name
                    log(f"Downloading {name} from {repo}...")
                    download(url, archive)
                    extract_dir = td_path / "extract"
                    extract_dir.mkdir()
                    extract_archive(archive, extract_dir)
                    for cand in candidate_executables(extract_dir):
                        log(f"Testing candidate {cand.name}")
                        if copy_candidate(cand):
                            return True
            except Exception as exc:
                log(f"Asset {name} failed: {exc}")
    return False


def install_from_source() -> bool:
    # Last-resort fallback. This may be slower than release assets, but it keeps
    # Render setup automatic when release asset names change.
    src_dir = VENDOR / "source"
    try:
        VENDOR.mkdir(parents=True, exist_ok=True)
        if not src_dir.exists():
            subprocess.check_call(["git", "clone", "--depth=1", "https://github.com/official-pikafish/Pikafish.git", str(src_dir)])
        build_dir = src_dir / "src"
        # Try common Stockfish/Pikafish make targets. Do not use profile-build on free instances.
        for cmd in (["make", "-j2", "build", "ARCH=x86-64"], ["make", "-j2", "build", "ARCH=x86-64-avx2"], ["make", "-j2"]):
            try:
                log("Compiling from source: " + " ".join(cmd))
                subprocess.check_call(cmd, cwd=str(build_dir), timeout=600)
                break
            except Exception as exc:
                log(f"Compile command failed: {exc}")
        for cand in candidate_executables(build_dir):
            if copy_candidate(cand):
                return True
    except Exception as exc:
        log(f"Source install failed: {exc}")
    return False


def install_nnue() -> bool:
    """Download Pikafish NNUE network required by recent Pikafish builds."""
    if NNUE.exists() and NNUE.stat().st_size > 1000000:
        log(f"NNUE network already installed at {NNUE}")
        return True
    try:
        VENDOR.mkdir(parents=True, exist_ok=True)
        tmp = NNUE.with_suffix(".nnue.tmp")
        log(f"Downloading NNUE network from {NNUE_URL}...")
        download(NNUE_URL, tmp)
        if tmp.stat().st_size < 1000000:
            raise RuntimeError(f"Downloaded NNUE file looks too small: {tmp.stat().st_size} bytes")
        tmp.replace(NNUE)
        log(f"Installed NNUE network at {NNUE}")
        return True
    except Exception as exc:
        log(f"Could not install NNUE network: {exc}")
        return False


def main() -> int:
    if os.environ.get("PIKAFISH_SKIP_INSTALL") == "1":
        log("PIKAFISH_SKIP_INSTALL=1, skipping.")
        return 0
    engine_ok = TARGET.exists()
    if engine_ok:
        log(f"Already installed at {TARGET}")
    else:
        engine_ok = install_from_release() or install_from_source()
    nnue_ok = install_nnue()
    if not engine_ok:
        log("Could not install Pikafish. Backend will still deploy; Master falls back to Expert.")
    if engine_ok and not nnue_ok:
        log("Pikafish installed but NNUE network is missing. Master may fall back until NNUE is available.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
