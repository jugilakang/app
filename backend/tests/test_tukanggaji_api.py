"""TukangGaji Pro V2 backend API regression tests.

Covers: health, auth (admin+worker), workers CRUD + duplicate-name 409,
attendance tap flow + edit with no-rest toggles, payroll/payments,
role guards, worker self-service, Excel exports.
"""
import io

import pytest
import requests

MONTH = "2026-09"  # current seeded month (today = 2026-09-24 WIB)
TODAY = "2026-09-24"


# ---------- health ----------

class TestHealth:
    def test_root(self, api_client, base_url):
        resp = api_client.get(f"{base_url}/api/")
        assert resp.status_code == 200
        assert "TukangGaji" in resp.json()["message"]


# ---------- auth ----------

class TestAuth:
    def test_admin_login_success(self, api_client, base_url):
        resp = api_client.post(f"{base_url}/api/auth/admin-login", json={"username": "admin", "password": "tukangpro123"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "admin"
        assert data["access_token"]

    def test_admin_login_wrong_password(self, api_client, base_url):
        resp = api_client.post(f"{base_url}/api/auth/admin-login", json={"username": "admin", "password": "salah123"})
        assert resp.status_code == 401
        assert "salah" in resp.json()["detail"].lower()

    def test_worker_login_success(self, api_client, base_url):
        resp = api_client.post(f"{base_url}/api/auth/worker-login", json={"code": "TG001", "pin": "0907"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "worker"
        assert data["worker"]["code"] == "TG001"
        assert data["worker"]["name"] == "Budi Santoso"
        assert "pin_hash" not in data["worker"]

    def test_worker_login_wrong_pin(self, api_client, base_url):
        resp = api_client.post(f"{base_url}/api/auth/worker-login", json={"code": "TG001", "pin": "0000"})
        assert resp.status_code == 401

    def test_worker_cannot_access_admin_endpoint(self, api_client, base_url, worker_token):
        resp = api_client.get(f"{base_url}/api/workers", headers={"Authorization": f"Bearer {worker_token}"})
        assert resp.status_code == 403

    def test_admin_cannot_access_worker_endpoint(self, admin_client, base_url):
        resp = admin_client.get(f"{base_url}/api/worker/me")
        assert resp.status_code == 403

    def test_no_token_unauthorized(self, base_url):
        resp = requests.get(f"{base_url}/api/dashboard")
        assert resp.status_code == 401


# ---------- workers CRUD ----------

class TestWorkers:
    def test_create_worker_returns_code_and_pin(self, admin_client, base_url, test_worker):
        assert test_worker["code"].startswith("TG")
        assert test_worker["pin"] == "4321"
        assert test_worker["group"] == "Kuli"
        assert test_worker["hourly_rate"] == 15000
        # persistence check
        get = admin_client.get(f"{base_url}/api/workers")
        assert any(w["id"] == test_worker["id"] for w in get.json())

    def test_duplicate_name_rejected_409(self, admin_client, base_url, test_worker):
        resp = admin_client.post(f"{base_url}/api/workers", json={
            "name": "test pekerja pytest", "phone": "", "group": "Tukang",
            "hourly_rate": 10000, "overtime_rate": 10000,
        })
        assert resp.status_code == 409
        assert "sudah terdaftar" in resp.json()["detail"].lower()

    def test_update_worker_rates(self, admin_client, base_url, test_worker):
        resp = admin_client.put(f"{base_url}/api/workers/{test_worker['id']}", json={"hourly_rate": 17000, "overtime_rate": 22000})
        assert resp.status_code == 200
        data = resp.json()
        assert data["hourly_rate"] == 17000
        assert data["overtime_rate"] == 22000
        # restore
        admin_client.put(f"{base_url}/api/workers/{test_worker['id']}", json={"hourly_rate": 15000, "overtime_rate": 20000})

    def test_reset_pin_and_login(self, api_client, admin_client, base_url, test_worker):
        resp = admin_client.post(f"{base_url}/api/workers/{test_worker['id']}/reset-pin")
        assert resp.status_code == 200
        new_pin = resp.json()["pin"]
        assert len(new_pin) == 4
        login = api_client.post(f"{base_url}/api/auth/worker-login", json={"code": test_worker["code"], "pin": new_pin})
        assert login.status_code == 200
        # old pin no longer works
        old = api_client.post(f"{base_url}/api/auth/worker-login", json={"code": test_worker["code"], "pin": "4321"})
        assert old.status_code == 401

    def test_invalid_group_rejected(self, admin_client, base_url):
        resp = admin_client.post(f"{base_url}/api/workers", json={
            "name": "TEST Grup Ngawur", "phone": "", "group": "Sihir",
            "hourly_rate": 10000, "overtime_rate": 10000,
        })
        assert resp.status_code == 422


# ---------- attendance tap flow + edit ----------

class TestAttendance:
    DATE = "2026-09-23"  # past date, does not touch TG001 today's record

    def test_tap_flow_and_edit_calculation(self, admin_client, base_url, test_worker):
        wid = test_worker["id"]
        # pulang before masuk must fail
        bad = admin_client.post(f"{base_url}/api/attendance/tap", json={"worker_id": wid, "type": "pulang", "date": self.DATE})
        assert bad.status_code == 400

        r = admin_client.post(f"{base_url}/api/attendance/tap", json={"worker_id": wid, "type": "masuk", "date": self.DATE, "time": "07:00"})
        assert r.status_code == 200 and r.json()["status"] == "masuk"
        # double masuk rejected
        dup = admin_client.post(f"{base_url}/api/attendance/tap", json={"worker_id": wid, "type": "masuk", "date": self.DATE, "time": "07:05"})
        assert dup.status_code == 400

        r = admin_client.post(f"{base_url}/api/attendance/tap", json={"worker_id": wid, "type": "istirahat", "date": self.DATE, "time": "11:30"})
        assert r.json()["status"] == "istirahat"
        r = admin_client.post(f"{base_url}/api/attendance/tap", json={"worker_id": wid, "type": "lembur", "date": self.DATE, "time": "18:00"})
        assert r.json()["status"] == "lembur"
        r = admin_client.post(f"{base_url}/api/attendance/tap", json={"worker_id": wid, "type": "pulang", "date": self.DATE, "time": "20:30"})
        row = r.json()
        assert row["status"] == "pulang"
        # auto lembur 20:30-18:00 = 2.5 jam; regular 8.5 (no toggles) = 127500 + 50000 = 177500
        assert row["calc"]["lembur_hours"] == 2.5
        assert row["calc"]["regular_hours"] == 8.5
        assert row["calc"]["total"] == 177500

        # edit: enable both no-rest toggles -> regular 11 jam -> 165000 + 50000 = 215000
        rec_id = row["record"]["id"]
        edit = admin_client.put(f"{base_url}/api/attendance/{rec_id}", json={
            "masuk_at": "07:00", "pulang_at": "20:30",
            "no_rest_siang": True, "no_rest_sore": True,
            "lembur": True, "lembur_hours": 2.5, "lembur_note": "TEST pasang atap",
        })
        assert edit.status_code == 200
        calc = edit.json()["calc"]
        assert calc["regular_hours"] == 11.0
        assert calc["total"] == 215000

        # verify persistence via GET attendance
        get = admin_client.get(f"{base_url}/api/attendance?date={self.DATE}")
        persisted = [x for x in get.json()["rows"] if x["worker"]["id"] == wid][0]
        assert persisted["record"]["no_rest_siang"] is True
        assert persisted["record"]["no_rest_sore"] is True

        # delete record -> gone
        dele = admin_client.delete(f"{base_url}/api/attendance/{rec_id}")
        assert dele.status_code == 200
        get2 = admin_client.get(f"{base_url}/api/attendance?date={self.DATE}")
        persisted2 = [x for x in get2.json()["rows"] if x["worker"]["id"] == wid][0]
        assert persisted2["record"] is None

    def test_seeded_tg001_today_calc(self, admin_client, base_url):
        resp = admin_client.get(f"{base_url}/api/attendance?date={TODAY}")
        assert resp.status_code == 200
        row = [r for r in resp.json()["rows"] if r["worker"]["code"] == "TG001"][0]
        assert row["record"]["masuk_at"] == "07:00"
        assert row["record"]["pulang_at"] == "20:30"
        assert row["calc"]["total"] == 215000


# ---------- dashboard ----------

class TestDashboard:
    def test_dashboard_today(self, admin_client, base_url):
        resp = admin_client.get(f"{base_url}/api/dashboard")
        assert resp.status_code == 200
        data = resp.json()
        assert data["date"] == TODAY
        assert data["active_workers"] >= 1
        assert data["present"] >= 1
        assert data["est_pay_today"] >= 215000
        tukang = [g for g in data["groups"] if g["group"] == "Tukang"][0]
        assert tukang["total"] >= 1 and tukang["present"] >= 1


# ---------- payroll & payments ----------

class TestPayroll:
    def test_payroll_period2_tg001(self, admin_client, base_url):
        resp = admin_client.get(f"{base_url}/api/payroll?month={MONTH}&period=2")
        assert resp.status_code == 200
        data = resp.json()
        assert data["start_date"] == "2026-09-16" and data["end_date"] == "2026-09-30"
        row = [r for r in data["rows"] if r["code"] == "TG001"][0]
        assert row["gross"] == 215000
        assert row["paid"] == 100000
        assert row["remaining"] == 115000

    def test_payment_history_contains_mandor(self, admin_client, base_url):
        resp = admin_client.get(f"{base_url}/api/payments?month={MONTH}&period=2")
        assert resp.status_code == 200
        payments = resp.json()
        assert any(p["method"] == "mandor" and p["mandor_name"] == "Pak RT" and p["total"] == 100000 for p in payments)

    def test_mandor_payment_requires_name(self, admin_client, base_url, test_worker):
        resp = admin_client.post(f"{base_url}/api/payments", json={
            "month": MONTH, "period": 2, "method": "mandor", "mandor_name": "", "note": "",
            "items": [{"worker_id": test_worker["id"], "amount": 5000}],
        })
        assert resp.status_code == 422

    def test_create_and_delete_payment(self, admin_client, base_url, test_worker):
        resp = admin_client.post(f"{base_url}/api/payments", json={
            "month": MONTH, "period": 2, "method": "langsung", "mandor_name": "", "note": "TEST bayar",
            "items": [{"worker_id": test_worker["id"], "amount": 5000}],
        })
        assert resp.status_code == 201
        pid = resp.json()["id"]
        assert resp.json()["total"] == 5000
        dele = admin_client.delete(f"{base_url}/api/payments/{pid}")
        assert dele.status_code == 200
        # verify deletion
        after = admin_client.get(f"{base_url}/api/payments?month={MONTH}&period=2")
        assert not any(p["id"] == pid for p in after.json())


# ---------- worker self-service ----------

class TestWorkerSelfService:
    def test_worker_payroll_period2(self, api_client, base_url, worker_token):
        resp = api_client.get(f"{base_url}/api/worker/payroll?month={MONTH}&period=2",
                              headers={"Authorization": f"Bearer {worker_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["gross"] == 215000
        assert data["paid"] == 100000
        assert data["remaining"] == 115000
        assert any(p["method"] == "mandor" and p["mandor_name"] == "Pak RT" and p["amount"] == 100000 for p in data["payments"])

    def test_worker_attendance_month(self, api_client, base_url, worker_token):
        resp = api_client.get(f"{base_url}/api/worker/attendance?month={MONTH}",
                              headers={"Authorization": f"Bearer {worker_token}"})
        assert resp.status_code == 200
        rows = resp.json()["rows"]
        today_row = [r for r in rows if r["record"]["date"] == TODAY]
        assert today_row and today_row[0]["calc"]["total"] == 215000


# ---------- Excel export ----------

class TestExport:
    @pytest.mark.parametrize("kind", ["payroll", "attendance"])
    def test_export_xlsx(self, base_url, admin_token, kind):
        resp = requests.get(f"{base_url}/api/export/{kind}?month={MONTH}&period=2&token={admin_token}")
        assert resp.status_code == 200
        assert resp.headers["Content-Type"].startswith("application/vnd.openxmlformats")
        assert resp.content[:2] == b"PK"  # valid xlsx zip
        assert "xlsx" in resp.headers.get("Content-Disposition", "")

    def test_export_requires_admin_token(self, base_url, worker_token):
        resp = requests.get(f"{base_url}/api/export/payroll?month={MONTH}&period=2&token={worker_token}")
        assert resp.status_code == 401
