import os
# Load .env file manually at startup
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
if os.path.exists(dotenv_path):
    with open(dotenv_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip().strip('"\'')

from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import engine, Base, get_db
from app.routes import employees, projects, seats, analytics, ai
from app import seed
from app.auth import RoleChecker

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Ethara Seat Allocation & Project Mapping API",
    description="Full-stack Seat Seating & Project Mapping API supporting 5,000+ records and AI Query Assistant.",
    version="1.0.0"
)

# Enable CORS for frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development ease, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(employees.router)
app.include_router(projects.router)
app.include_router(seats.router)
app.include_router(analytics.router)
app.include_router(ai.router)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the Ethara Seat Allocation & Project Mapping API",
        "docs": "/docs",
        "version": "1.0.0"
    }

@app.post("/api/seed", status_code=status.HTTP_202_ACCEPTED)
def trigger_seeding(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_role: str = Depends(RoleChecker(allowed_roles={"Admin"}))
):
    def run_seed():
        try:
            seed.seed_database(db)
        except Exception as e:
            print(f"Seeding error: {e}")

    background_tasks.add_task(run_seed)
    return {"message": "Seeding started! Data will be ready in ~60 seconds. Refresh the page after a minute."}
