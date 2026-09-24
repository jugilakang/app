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

TEST_DATES = ["2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24"]


def ensure_day(admin_client, base_url, wid, date, masuk, pulang, no_siang=False, no_sore=False,
               lembur=False, lembur_hours=None, note=""):
    """Create (or reuse) an attendance record then PUT-edit for full control. Returns (rec_id, calc)."""
    rows = admin_client.get(f"{base_url}/api/attendance?date={date}").json().get("rows", [])
    rec = next((r["record"] for r in rows if r["worker"]["id"] == wid), None)
    if rec:
        rec_id = rec["id"]
    else:
        r = admin_client.post(f"{base_url}/api/attendance/tap", json={"worker_id": wid, "type": "masuk", "date": date, "time": masuk})
        assert r.status_code == 200, r.text
        r = admin_client.post(f"{base_url}/api/attendance/tap", json={"worker_id": wid, "type": "pulang", "date": date, "time": pulang})
        assert r.status_code == 200, r.text
        rec_id = r.json()["record"]["id"]
    edit = admin_client.put(f"{base_url}/api/attendance/{rec_id}", json={
        "masuk_at": masuk, "pulang_at": pulang,
        "no_rest_siang": no_siang, "no_rest_sore": no_sore,
        "lembur": lembur, "lembur_hours": lembur_hours, "lembur_note": note,
    })
    assert edit.status_code == 200, edit.text
    return rec_id, edit.json()["calc"]


def cleanup_worker(admin_client, base_url, worker):
    """Delete test attendance records then the worker itself."""
    for day in TEST_DATES:
        rows = admin_client.get(f"{base_url}/api/attendance?date={day}").json().get("rows", [])
        for r in rows:
            if r["worker"]["id"] == worker["id"] and r["record"]:
                admin_client.delete(f"{base_url}/api/attendance/{r['record']['id']}")
    admin_client.delete(f"{base_url}/api/workers/{worker['id']}")


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


@pytest.fixture(scope="module")
def test_worker(admin_client, base_url):
    """Create a TEST_ worker (160rb/hari, lembur 25rb/jam), yield it, delete after module."""
    payload = {"name": "TEST Pekerja Pytest", "phone": "", "group": "Kuli", "daily_rate": 160000, "overtime_rate": 25000, "pin": "4321"}
    resp = admin_client.post(f"{base_url}/api/workers", json=payload)
    if resp.status_code == 409:
        existing = [w for w in admin_client.get(f"{base_url}/api/workers").json() if w["name"] == payload["name"]]
        worker = existing[0]
        # normalize rates in case a stale worker from an older run exists
        upd = admin_client.put(f"{base_url}/api/workers/{worker['id']}", json={"daily_rate": 160000, "overtime_rate": 25000})
        worker = upd.json()
        yield worker
        cleanup_worker(admin_client, base_url, worker)
        return
    assert resp.status_code == 201, resp.text
    worker = resp.json()
    yield worker
    cleanup_worker(admin_client, base_url, worker)


@pytest.fixture(scope="session")
def login_worker(admin_client, base_url):
    """Session-scoped TEST worker with a KNOWN PIN + one attendance day (2026-09-23,
    07:00-17:00, no-rest siang+sore -> rest 2,0 j / rest_pay 50.000 / total 210.000).
    Real workers' PINs are unknown, so worker-login tests use this account."""
    payload = {"name": "TEST Pekerja Login", "phone": "", "group": "Kuli", "daily_rate": 160000, "overtime_rate": 25000, "pin": "4321"}
    resp = admin_client.post(f"{base_url}/api/workers", json=payload)
    if resp.status_code == 409:
        worker = [w for w in admin_client.get(f"{base_url}/api/workers").json() if w["name"] == payload["name"]][0]
        pin = admin_client.post(f"{base_url}/api/workers/{worker['id']}/reset-pin").json()["pin"]
        admin_client.put(f"{base_url}/api/workers/{worker['id']}", json={"daily_rate": 160000, "overtime_rate": 25000})
    else:
        assert resp.status_code == 201, resp.text
        worker = resp.json()
        pin = "4321"
    ensure_day(admin_client, base_url, worker["id"], "2026-09-23", "07:00", "17:00",
               no_siang=True, no_sore=True, note="TEST login worker")
    worker["pin"] = pin
    yield worker
    cleanup_worker(admin_client, base_url, worker)


@pytest.fixture(scope="session")
def worker_token(api_client, base_url, login_worker):
    resp = api_client.post(f"{base_url}/api/auth/worker-login", json={"code": login_worker["code"], "pin": login_worker["pin"]})
    assert resp.status_code == 200, f"Worker login failed: {resp.text}"
    return resp.json()["access_token"]
