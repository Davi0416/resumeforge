import json, os
from pathlib import Path

CONFIG_PATH = Path(__file__).parent / "config.json"

def _load() -> dict:
    if CONFIG_PATH.exists():
        try:
            return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}

def _save(data: dict):
    CONFIG_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

def get(key: str, default=None):
    return _load().get(key, default)

def set(key: str, value):
    data = _load()
    if value is None or value == "":
        data.pop(key, None)
    else:
        data[key] = value
    _save(data)

def get_github_token() -> str | None:
    return get("githubToken") or None

def set_github_token(token: str | None):
    set("githubToken", token)

def get_apilayer_key() -> str | None:
    return get("apilayerKey") or None

def set_apilayer_key(key: str | None):
    set("apilayerKey", key)
