# Ethara Seat Allocation & Project Mapping System

## 🌐 Live Deployment

| Service | URL |
|---------|-----|
| **Frontend** | https://seat-allocation-project-mapping-sys.vercel.app/ |
| **Backend API** | https://seat-allocation-project-mapping-system.onrender.com/ |
| **Swagger Docs** | https://seat-allocation-project-mapping-system.onrender.com/docs |

---

A comprehensive full-stack enterprise application designed to manage employee seating layouts, project mappings, seat utilization metrics, and new joiner onboarding queues for approximately 5,000 employees. 

This repository houses a **FastAPI backend** (SQLite/PostgreSQL compatible) and a **React + Tailwind CSS v4 frontend** powered by Vite.

---

## 🚀 Key Features

1. **Interactive Floor Plan Grid:** An aesthetic, glassmorphic layout displaying 1,000 seats per floor (5 floors, 4 zones: A, B, C, D, with 250 seats each). Shows walk-aisles and colored seating states (Available, Occupied, Reserved, Maintenance) with live hover occupant details.
2. **HR Onboarding Desk:** A dedicated queue for new joiners (`ONBOARDING` state). Suggests the top 5 closest available seats to project teammates or department colleagues using a smart proximity algorithm.
3. **Analytics Dashboard:** Visual representation of office-wide seating utilization, floor-by-floor occupancy rates, and department allocation trends.
4. **AI Assistant / NLP Query Agent:** An integrated chat assistant supporting Google Gemini 3.1-flash-lite semantic parsing and a failsafe regex fallback. Handles lookups, recommendations, statistics, and role-enforced allocations/releases (e.g., *"Where sits Ronald Ward?"*, *"What is the occupancy rate of the Engineering department?"*).
5. **Role-Based Access Control (RBAC):** Dynamically restricts operations (seating bookings, project updates, data lists) across four simulated roles: **Employee (Read-only)**, **HR Specialist**, **Project Team Manager**, and **System Admin**. A navbar role picker is included for easy testing.
6. **Sub-second Seeding Tool:** Seeds exactly 5,500 seats (5 floors × 4 zones × 275 seats, grouped into 11 bays of 25), 20 projects, and 5,000 employees with contiguous project seating clusters.

---

## 🛠 Tech Stack

* **Frontend:** React.js, Tailwind CSS v4 (Vite compiler), Lucide Icons, Axios.
* **Backend:** FastAPI, Python, Uvicorn, SQLAlchemy.
* **Database:** SQLite (local development) / PostgreSQL via Supabase (production).
* **Deployment:** Render (backend), Vercel (frontend).

---

## 📂 Project Structure

```text
ethara-seat-allocation-system/
├── backend/
│   ├── app/
│   │   ├── routes/          # REST Endpoint Routers
│   │   │   ├── employees.py # Employee CRUD
│   │   │   ├── projects.py  # Project assignments
│   │   │   ├── seats.py     # Allocation & recommendations
│   │   │   ├── analytics.py # Seating utilization analytics
│   │   │   └── ai.py        # AI Assistant chat gateway
│   │   ├── database.py      # SQLAlchemy configuration
│   │   ├── models.py        # Database models (declarative tables)
│   │   ├── schemas.py       # Pydantic request/response serializers
│   │   ├── crud.py          # Seating, proximity, and CRUD operations
│   │   ├── ai_parser.py     # Regex & SQL NLP query parser
│   │   ├── auth.py          # Header-based RBAC verification
│   │   └── seed.py          # 5,000-record database seeding engine
│   ├── requirements.txt     # Python package requirements
│   └── run.py               # Uvicorn startup entrypoint
├── frontend/
│   ├── src/
│   │   ├── components/      # UI Dashboard, Layout, & Roster panels
│   │   │   ├── FloorPlan.jsx
│   │   │   ├── StatsDashboard.jsx
│   │   │   ├── SeatingTable.jsx
│   │   │   ├── OnboardingPanel.jsx
│   │   │   └── AiChatPanel.jsx
│   │   ├── App.jsx          # Dashboard layout & routing
│   │   ├── api.js           # API Client (Axios + X-User-Role injection)
│   │   └── index.css        # Tailwind v4 directives & glass styles
│   ├── package.json
│   └── vite.config.js       # Vite configuration with @tailwindcss/vite
├── README.md
└── AI_PROMPTS.md            # AI interaction and prompts journal
```

---

## 📊 Database Schema

```mermaid
erDiagram
    EMPLOYEE {
        int id PK
        string employee_id UK "Unique EMP-XXXXX"
        string first_name
        string last_name
        string email UK
        string department
        string role
        string status "ACTIVE, ONBOARDING, EXITED"
        date joining_date
        datetime created_at
        datetime updated_at
    }
    PROJECT {
        int id PK
        string project_code UK "Unique PRJ-XXXX"
        string name
        string department
        string manager_name
        date start_date
        date end_date
    }
    SEAT {
        int id PK
        string seat_code UK "FL[1-5]-Z-[A-D]-B[01-11]-S[001-275]"
        int floor
        string zone
        int bay
        int number
        string status "AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE"
    }
    EMPLOYEE_PROJECTS {
        int id PK
        int employee_id FK
        int project_id FK
        boolean is_primary
    }
    SEAT_ALLOCATION {
        int id PK
        int employee_id FK "Nullable"
        int seat_id FK
        string allocated_by "HR, ADMIN, SYSTEM"
        datetime allocated_at
        datetime released_at "Nullable"
    }

    EMPLOYEE ||--o{ EMPLOYEE_PROJECTS : "assigned to"
    PROJECT ||--o{ EMPLOYEE_PROJECTS : "assigned to"
    EMPLOYEE ||--o| SEAT_ALLOCATION : "holds"
    SEAT ||--o| SEAT_ALLOCATION : "holds"
```

---

## 🔒 Role-Based Access Control (RBAC)

The system restricts routes and UI controls based on the simulated role passed via the `X-User-Role` request header:

* **Employee:** Read-only access to all dashboards, directories, floor plans, and AI assistant queries.
* **HR Specialist:** Access to the Onboarding queue, seat proximity recommendations, allocating seats to onboarding candidates, and releasing seats for exiting employees.
* **Project Team Lead:** Access to assign/remove employees from projects and edit project metadata details.
* **System Admin:** Absolute authority. Can toggle seat statuses (Maintenance, Reserved), override allocations, seed/reset database, and execute AI commands.

---

## 🔌 API Documentation Summary

FastAPI provides an interactive OpenAPI / Swagger UI at:
- **Production:** https://seat-allocation-project-mapping-system.onrender.com/docs
- **Local:** `http://localhost:8080/docs`

### Key Endpoints:
* `POST /api/seed` - Admin only. Resets the database and seeds 5,000 employees, seats, and 20 projects.
* `GET /api/employees` - Queries employees list with pagination and search keywords/filters.
* `GET /api/seats` - Retrieves seat list layout for a specified `floor` and `zone`.
* `POST /api/seats/allocate` - Allocates a seat to an employee.
* `POST /api/seats/release` - Vacates an occupied seat.
* `GET /api/seats/recommend/{employee_id}` - Computes teammate-proximity recommended seats for a new joiner.
* `GET /api/analytics` - Calculates occupancy rates (overall, floor, and department levels).
* `POST /api/ai/query` - Executes a natural language query (LLM or regex) and returns structured entities and description text.

---

## ⚙️ Local Installation & Startup

### Prerequisites:
* Python 3.10+
* Node.js v18+ & npm

### 1. Backend Startup:
Create a `.env` file inside the `backend/` folder to securely configure your Google Gemini API Key:
```env
GEMINI_API_KEY="your-google-gemini-api-key"
```

Start the service:
```bash
cd backend
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows use venv\Scripts\activate
# Install dependencies
pip install -r requirements.txt
# Run server (starts on http://localhost:8080)
python run.py
```

### 2. Seeding the Database:
After the backend is running, trigger database initialization:
```bash
curl -X POST -H "X-User-Role: Admin" http://localhost:8080/api/seed
```
*(This creates `ethara_seats.db` and populates 5,000 employees, 5,000 seats, and 20 projects in contiguous clusters).*

### 3. Frontend Startup:
```bash
cd frontend
# Install packages
npm install
# Start dev server (runs on http://localhost:5173)
npm run dev
```

Open `http://localhost:5173` to interact with the full-stack system!

---

## 🌐 Production Deployment Guide

### Database Migration (PostgreSQL / Supabase):
The application is database-agnostic. To transition from SQLite to Supabase PostgreSQL:
1. Copy your Supabase PostgreSQL connection string.
2. Set the `DATABASE_URL` environment variable on the hosting provider (e.g., Render/Heroku):
   ```env
   DATABASE_URL=postgresql://postgres.xxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
   ```
3. Install PostgreSQL adapters in `backend/requirements.txt`:
   ```text
   psycopg2-binary>=2.9.0
   ```
4. Re-run `POST /api/seed` to build and populate schemas in the PostgreSQL database.

### Backend Hosting (Render):
1. Connect the repository to Render, creating a **Web Service**.
2. Select environment: **Python**.
3. Set the start command: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:$PORT` (install `gunicorn` in requirements).
4. Add the `DATABASE_URL` env variable pointing to your Supabase PostgreSQL.

### Frontend Hosting (Vercel):
1. Connect the repository to Vercel, creating a new project.
2. Set build command: `npm run build` and output directory: `dist`.
3. Update `frontend/src/api.js` `API_BASE` endpoint or set an environment variable `VITE_API_BASE` pointing to your Render backend domain.
