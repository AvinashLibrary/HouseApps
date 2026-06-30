from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, jwt, bcrypt
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
from datetime import datetime, timedelta, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get("JWT_SECRET", "exam-prep-portal-secret-key-change-me")
JWT_ALGO = "HS256"
JWT_EXPIRES_MIN = 60 * 24 * 30

app = FastAPI()
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------- MODELS ----------
class SignupBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: Optional[str] = None

class LoginBody(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str] = None

class TokenResp(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class ProgressBody(BaseModel):
    exam_id: str
    goal: str
    timeline_days: int
    topic_status: Dict[str, str] = {}
    streak_days: int = 0
    last_active_date: Optional[str] = None


# ---------- AUTH ----------
def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_pw(p: str, hp: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), hp.encode())
    except:
        return False

def make_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRES_MIN),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if not creds:
        raise HTTPException(401, "Not authenticated")

    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
        uid = payload.get("sub")
    except:
        raise HTTPException(401, "Invalid token")

    user = await db.users.find_one({"id": uid}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")

    return user


# ---------- DATA ----------
EXAMS = [
    {"id": "neet", "name": "NEET", "full": "National Eligibility cum Entrance Test", "tag": "Medical", "color": "#D35400", "next_date": "2026-05-03"},
    {"id": "upsc", "name": "UPSC CSE", "full": "Civil Services Examination", "tag": "Civil Services", "color": "#2E7D32", "next_date": "2026-06-07"},
    {"id": "sbi_po", "name": "SBI PO", "full": "State Bank of India Probationary Officer", "tag": "Banking", "color": "#1A4DB5", "next_date": "2026-04-12"},
    {"id": "sbi_clerk", "name": "SBI Clerk", "full": "State Bank of India Clerk", "tag": "Banking", "color": "#7D5A00", "next_date": "2026-03-15"},
]

GOALS = [
    {"id": "top_rank", "label": "Top Rank", "desc": "Aim for AIR <1000. Intensive plan."},
    {"id": "safe_pass", "label": "Safe Qualify", "desc": "Comfortable cutoff. Balanced plan."},
    {"id": "first_timer", "label": "First Timer", "desc": "Building foundation. Step-by-step."},
]

TOPICS = {
    "neet": [
        {
            "subject": "Physics",
            "chapters": [
                {
                    "name": "Mechanics",
                    "topics": [
                        {"id": "neet_phy_1", "name": "Kinematics", "freq": "High"},
                        {"id": "neet_phy_2", "name": "Laws of Motion", "freq": "High"},
                        {"id": "neet_phy_3", "name": "Work, Energy & Power", "freq": "High"},
                        {"id": "neet_phy_4", "name": "Rotational Motion", "freq": "Medium"},
                    ],
                }
            ],
        }
    ]
}

DIGEST = [
    {"id": "d1", "exam": "NEET", "title": "Why Genetics is scoring 70+ marks this year", "source": "PW YouTube", "minutes": 12, "tag": "Trend"}
]

UPSC_TRACKS = [
    {"age_range": "21-24", "label": "Early Bird", "years_available": "6+ attempts"}
]


# ---------- PLAN ----------
def build_plan(exam_id: str, goal: str, timeline_days: int) -> Dict[str, Any]:
    tree = TOPICS.get(exam_id)
    if not tree:
        raise HTTPException(404, "Exam not found")

    flat = []
    for s in tree:
        for c in s["chapters"]:
            for t in c["topics"]:
                flat.append(t)

    weeks = max(1, timeline_days // 7)
    per_week = max(1, len(flat) // weeks)

    plan = []
    for i in range(weeks):
        plan.append({
            "week": i + 1,
            "topics": flat[i * per_week:(i + 1) * per_week]
        })

    return {"weeks": plan}


# ---------- ROUTES ----------
@api.get("/")
async def root():
    return {"message": "Exam Prep Portal API", "status": "ok"}


@api.post("/auth/signup")
async def signup(body: SignupBody):
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(400, "Email already registered")

    uid = str(uuid.uuid4())

    await db.users.insert_one({
        "id": uid,
        "email": body.email.lower(),
        "full_name": body.full_name or "",
        "hashed_password": hash_pw(body.password),
    })

    return {"access_token": make_token(uid)}


@api.post("/auth/login")
async def login(body: LoginBody):
    user = await db.users.find_one({"email": body.email.lower()})

    if not user or not verify_pw(body.password, user["hashed_password"]):
        raise HTTPException(401, "Invalid credentials")

    return {"access_token": make_token(user["id"])}


@api.get("/exams")
async def list_exams():
    return {"exams": EXAMS, "goals": GOALS}


@api.get("/exams/{exam_id}/topics")
async def get_topics(exam_id: str):
    return {"subjects": TOPICS.get(exam_id)}


@api.get("/exams/{exam_id}/plan")
async def get_plan(exam_id: str, goal: str = "safe_pass", timeline_days: int = 90):
    return build_plan(exam_id, goal, timeline_days)


@api.get("/digest")
async def get_digest():
    return {"items": DIGEST}


@api.get("/progress")
async def get_progress(user: dict = Depends(get_current_user)):
    return await db.progress.find_one({"user_id": user["id"]})


@api.post("/progress")
async def save_progress(body: ProgressBody, user: dict = Depends(get_current_user)):
    data = body.dict()
    data["user_id"] = user["id"]

    await db.progress.update_one(
        {"user_id": user["id"]},
        {"$set": data},
        upsert=True
    )

    return {"ok": True}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def seed():
    await db.users.create_index("email", unique=True)

    if not await db.users.find_one({"email": "test@exam.com"}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": "test@exam.com",
            "full_name": "Test Aspirant",
            "hashed_password": hash_pw("test1234"),
        })


@app.on_event("shutdown")
async def shutdown():
    client.close()