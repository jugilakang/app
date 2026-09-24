from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, date


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Models use string ids so API responses never expose Mongo ObjectIds.
class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    location: str = Field(default="", max_length=120)

class Project(ProjectCreate):
    id: str
    status: Literal["active", "archived"] = "active"
    created_at: str
    worker_count: int = 0

class WorkerCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    phone: str = Field(default="", max_length=30)
    project_id: str
    daily_rate: float = Field(gt=0)
    half_day_rate: float = Field(gt=0)
    overtime_rate: float = Field(gt=0)

class Worker(WorkerCreate):
    id: str
    status: Literal["active", "inactive"] = "active"
    created_at: str
    project_name: str = ""

class AttendanceCreate(BaseModel):
    project_id: str
    worker_id: str
    date: str
    status: Literal["full", "half", "absent"]
    half_day_period: Optional[Literal["morning", "afternoon"]] = None
    time_in: Optional[str] = None
    time_out: Optional[str] = None
    overtime_hours: float = Field(default=0, ge=0, le=24)
    notes: str = Field(default="", max_length=240)

class Attendance(AttendanceCreate):
    id: str
    created_at: str
    worker_name: str = ""
    daily_rate: float = 0
    half_day_rate: float = 0
    overtime_rate: float = 0

class PaymentUpdate(BaseModel):
    project_id: str
    start_date: str
    end_date: str
    status: Literal["paid", "unpaid"]

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def clean(doc: dict) -> dict:
    return {key: value for key, value in doc.items() if key != "_id"}

@api_router.get("/")
async def root():
    return {"message": "TukangGaji Pro API"}

@api_router.get("/projects", response_model=List[Project])
async def get_projects():
    rows = await db.projects.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    counts = await db.workers.aggregate([
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$project_id", "count": {"$sum": 1}}},
    ]).to_list(500)
    count_map = {row["_id"]: row["count"] for row in counts}
    return [Project(**{**row, "worker_count": count_map.get(row["id"], 0)}) for row in rows]

@api_router.post("/projects", response_model=Project)
async def create_project(input: ProjectCreate):
    project = Project(id=str(uuid.uuid4()), created_at=now_iso(), **input.model_dump())
    await db.projects.insert_one(project.model_dump())
    return project

@api_router.get("/workers", response_model=List[Worker])
async def get_workers(project_id: Optional[str] = None):
    query = {"status": "active"}
    if project_id:
        query["project_id"] = project_id
    rows = await db.workers.find(query, {"_id": 0}).sort("name", 1).to_list(1000)
    projects = await db.projects.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(500)
    project_map = {row["id"]: row["name"] for row in projects}
    return [Worker(**{**row, "project_name": project_map.get(row["project_id"], "")}) for row in rows]

@api_router.post("/workers", response_model=Worker)
async def create_worker(input: WorkerCreate):
    project = await db.projects.find_one({"id": input.project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan")
    worker = Worker(id=str(uuid.uuid4()), created_at=now_iso(), project_name=project["name"], **input.model_dump())
    await db.workers.insert_one(worker.model_dump(exclude={"project_name"}))
    return worker

@api_router.get("/attendance", response_model=List[Attendance])
async def get_attendance(
    project_id: str,
    attendance_date: str = Query(default_factory=lambda: date.today().isoformat(), alias="date"),
):
    rows = await db.attendance.find({"project_id": project_id, "date": attendance_date}, {"_id": 0}).to_list(1000)
    workers = await db.workers.find({"project_id": project_id, "status": "active"}, {"_id": 0}).to_list(1000)
    worker_map = {row["id"]: row for row in workers}
    return [Attendance(**{**row, "worker_name": worker_map.get(row["worker_id"], {}).get("name", ""),
                          "daily_rate": worker_map.get(row["worker_id"], {}).get("daily_rate", 0),
                          "half_day_rate": worker_map.get(row["worker_id"], {}).get("half_day_rate", 0),
                          "overtime_rate": worker_map.get(row["worker_id"], {}).get("overtime_rate", 0)}) for row in rows]

@api_router.post("/attendance", response_model=Attendance)
async def save_attendance(input: AttendanceCreate):
    worker = await db.workers.find_one({"id": input.worker_id, "project_id": input.project_id}, {"_id": 0})
    if not worker:
        raise HTTPException(status_code=404, detail="Pekerja tidak ditemukan di proyek ini")
    existing = await db.attendance.find_one({"worker_id": input.worker_id, "date": input.date}, {"_id": 0})
    record = {"id": existing["id"] if existing else str(uuid.uuid4()), "created_at": existing.get("created_at", now_iso()) if existing else now_iso(), **input.model_dump()}
    await db.attendance.replace_one({"id": record["id"]}, record, upsert=True)
    return Attendance(**{**record, "worker_name": worker["name"], "daily_rate": worker["daily_rate"], "half_day_rate": worker["half_day_rate"], "overtime_rate": worker["overtime_rate"]})

@api_router.get("/dashboard")
async def get_dashboard(project_id: str, attendance_date: str = Query(default_factory=lambda: date.today().isoformat(), alias="date")):
    workers = await db.workers.count_documents({"project_id": project_id, "status": "active"})
    rows = await db.attendance.find({"project_id": project_id, "date": attendance_date}, {"_id": 0}).to_list(1000)
    present = sum(1 for row in rows if row["status"] == "full")
    half = sum(1 for row in rows if row["status"] == "half")
    absent = max(workers - present - half, 0)
    return {"active_workers": workers, "present": present, "half_day": half, "absent": absent, "logged": len(rows), "date": attendance_date}

@api_router.get("/payroll")
async def get_payroll(project_id: str, start_date: str, end_date: str):
    rows = await db.attendance.find({"project_id": project_id, "date": {"$gte": start_date, "$lte": end_date}}, {"_id": 0}).to_list(5000)
    workers = await db.workers.find({"project_id": project_id, "status": "active"}, {"_id": 0}).to_list(1000)
    worker_map = {row["id"]: row for row in workers}
    summary = {}
    for row in rows:
        worker = worker_map.get(row["worker_id"])
        if not worker:
            continue
        item = summary.setdefault(row["worker_id"], {"worker_id": row["worker_id"], "worker_name": worker["name"], "days": 0, "half_days": 0, "overtime_hours": 0, "daily_total": 0, "overtime_total": 0})
        if row["status"] == "full":
            item["days"] += 1
            item["daily_total"] += worker["daily_rate"]
        elif row["status"] == "half":
            item["half_days"] += 1
            item["daily_total"] += worker["half_day_rate"]
        item["overtime_hours"] += row.get("overtime_hours", 0)
        item["overtime_total"] += row.get("overtime_hours", 0) * worker["overtime_rate"]
    payment = await db.payments.find_one({"project_id": project_id, "start_date": start_date, "end_date": end_date}, {"_id": 0})
    result = list(summary.values())
    for item in result:
        item["total"] = item["daily_total"] + item["overtime_total"]
    return {"rows": result, "total": sum(item["total"] for item in result), "status": payment.get("status", "unpaid") if payment else "unpaid", "start_date": start_date, "end_date": end_date}

@api_router.post("/payroll/status")
async def update_payroll_status(input: PaymentUpdate):
    record = {"id": str(uuid.uuid4()), **input.model_dump(), "paid_at": now_iso() if input.status == "paid" else None}
    await db.payments.update_one({"project_id": input.project_id, "start_date": input.start_date, "end_date": input.end_date}, {"$set": record}, upsert=True)
    return {"status": input.status}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
