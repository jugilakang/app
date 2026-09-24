import os
from pathlib import Path

import pytest
import requests


def _load_base_url() -> str:
    # Read public backend URL from frontend/.env (EXPO_PUBLIC_BACKEND_URL)
    env_path = Path("/app/frontend/.env")
    for line in env_path.read_text().splitlines():
        if line.startswith("EXPO_PUBLIC_BACKEND_URL=") or line.startswith("EXPO_BACKEND_URL="):
            return line.split("=", 1)[1].strip().strip('"').rstrip("/")
    url = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
    if not url:
        raise RuntimeError("Backend URL not found in frontend/.env")
    return url.rstrip("/")


BASE_URL = _load_base_url()


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="session")
def admin_token(api_client, base_url):
    resp = api_client.post(f"{base_url}/api/auth/admin-login", json={"username": "admin", "password": "tukangpro123"})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture(scope="session")
def admin_client(api_client, admin_token):
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


@pytest.fixture(scope="session")
def worker_token(api_client, base_url):
    resp = api_client.post(f"{base_url}/api/auth/worker-login", json={"code": "TG001", "pin": "8366"})
    assert resp.status_code == 200, f"Worker login failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture(scope="module")
def test_worker(admin_client, base_url):
    """Create a TEST_ worker (daily_rate model), yield it, delete after module. Tolerates xdist duplicates."""
    payload = {"name": "TEST Pekerja Pytest", "phone": "", "group": "Kuli", "daily_rate": 160000, "overtime_rate": 20000, "pin": "4321"}
    resp = admin_client.post(f"{base_url}/api/workers", json=payload)
    if resp.status_code == 409:
        existing = [w for w in admin_client.get(f"{base_url}/api/workers").json() if w["name"] == payload["name"]]
        worker = existing[0]
        yield worker
        return
    assert resp.status_code == 201, resp.text
    worker = resp.json()
    yield worker
    # cleanup: delete any attendance of this worker, then the worker
    for day in ["2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23"]:
        rows = admin_client.get(f"{base_url}/api/attendance?date={day}").json().get("rows", [])
        for r in rows:
            if r["worker"]["id"] == worker["id"] and r["record"]:
                admin_client.delete(f"{base_url}/api/attendance/{r['record']['id']}")
    admin_client.delete(f"{base_url}/api/workers/{worker['id']}")
