# AI Prompts & Development Journal

This file documents all AI prompts used, what was generated, what was fixed manually, and how correctness was verified during the development of the **Ethara Seat Allocation & Project Mapping System**.

---

## Prompt 1 – Architecture

**Prompt Used:**
> "Design a full-stack architecture for a seat allocation and project mapping system for 5,000 employees. Use FastAPI for backend, React + Tailwind CSS for frontend, PostgreSQL for database. Include role-based access control for Employee, HR, Project Lead, and Admin roles. Include an AI assistant for natural language queries. Suggest folder structure and tech stack."

**AI Generated:**
- Folder structure separating `backend/` and `frontend/`
- FastAPI with SQLAlchemy ORM and Pydantic schemas
- React SPA with Axios API client
- Role-based access via `X-User-Role` request header

**Manually Verified:**
- Confirmed separation of concerns
- Added CORS middleware for frontend-backend communication
- Validated role header injection pattern works across all routes

---

## Prompt 2 – Database

**Prompt Used:**
> "Create SQLAlchemy ORM models for an employee seat allocation system. Tables needed: Employee (employee_id, first_name, last_name, email, department, role, joining_date, status, created_at, updated_at), Project (project_code, name, department, manager_name, start_date, end_date), Seat (floor, zone, bay, seat_number, status), EmployeeProject mapping table with is_primary flag, SeatAllocation table with employee_id, seat_id, allocated_by, allocated_at, released_at. Add proper foreign keys, indexes, and unique constraints."

**AI Generated:**
- `models.py` with all 5 tables
- Foreign keys with CASCADE delete
- UniqueConstraint on employee-project mapping
- Indexes on department, floor, zone, status fields

**What AI Got Wrong:**
- Missing `bay` field on Seat model
- Missing `joining_date`, `created_at`, `updated_at` on Employee model
- Missing `onupdate` on `updated_at`

**Manually Fixed:**
- Added `bay = Column(Integer, index=True)` to Seat
- Added `joining_date`, `created_at`, `updated_at` to Employee
- Added `onupdate=datetime.datetime.utcnow` to `updated_at`

---

## Prompt 3 – Backend APIs

**Prompt Used:**
> "Create FastAPI route files for employees, projects, seats, and analytics. Use SQLAlchemy sessions via dependency injection. Include pagination with skip/limit, search by name/email/department, filter by status and project. Add role-based access using RoleChecker dependency. Return proper HTTP status codes."

**AI Generated:**
- `routes/employees.py` — CRUD with search and pagination
- `routes/projects.py` — project CRUD with employee assignment
- `routes/seats.py` — seat listing, allocation, release, recommendations
- `routes/analytics.py` — occupancy metrics by floor and department

**What AI Got Wrong:**
- Analytics was making 25+ individual COUNT queries (one per metric)
- Seats route was making 2 extra queries per seat (N+1 problem = 500 queries for 250 seats)

**Manually Fixed:**
- Replaced 25+ COUNT queries with 5 aggregated GROUP BY + CASE queries
- Replaced per-seat queries with single bulk JOIN query for all occupants

---

## Prompt 4 – Seat Allocation Logic

**Prompt Used:**
> "Implement seat allocation logic in crud.py that: prevents duplicate seat allocation, automatically releases old seat when employee is assigned a new one, clusters employees by project in the same floor and zone, suggests top 5 proximity-based seat recommendations for new joiners based on where their project teammates are sitting. If no teammates found, fall back to department colleagues."

**AI Generated:**
- `crud.py` with `allocate_seat()`, `release_seat()`, `get_seat_recommendations()`
- Project-based proximity algorithm grouping teammates by floor/zone

**What AI Got Wrong:**
- `get_seat_recommendations()` was fetching each teammate's seat one by one in a Python loop (N+1 queries)

**Manually Fixed:**
- Replaced loop with single JOIN query across `SeatAllocation`, `Employee`, `EmployeeProject` tables

---

## Prompt 5 – AI Assistant

**Prompt Used:**
> "Build a natural language query parser in ai_parser.py. Use Google Gemini API for intent and entity extraction. Add a regex fallback if API is unavailable. Support these intents: find_employee_seat, find_seat_occupant, project_proximity, floor_occupancy, department_occupancy, list_onboarding, assign_seat, release_seat, project_manager. Return structured JSON with intent, entities, response_text, and data."

**AI Generated:**
- `ai_parser.py` with Gemini API call using `urllib.request`
- Regex fallback patterns for all intents
- `routes/ai.py` endpoint

**What AI Got Wrong:**
- Used model name `gemini-3.1-flash-lite` which does not exist
- No role-based access check for assign_seat and release_seat intents

**Manually Fixed:**
- Corrected model to `gemini-2.0-flash-lite`
- Added role check inside parser — only HR and Admin can assign/release via AI

---

## Prompt 6 – Frontend

**Prompt Used:**
> "Build a React + Tailwind CSS v4 single page application with: sidebar navigation, dark/light mode toggle with localStorage persistence, role switcher dropdown in navbar, floor plan grid showing 275 seats per zone (11 rows x 25 columns) with color-coded seat status, employee table with search and filter, onboarding panel with seat recommendations, analytics dashboard with charts, AI chat panel, projects panel, and settings panel with admin seed button."

**AI Generated:**
- All component files: `FloorPlan.jsx`, `StatsDashboard.jsx`, `SeatingTable.jsx`, `OnboardingPanel.jsx`, `AiChatPanel.jsx`, `ProjectsPanel.jsx`, `SettingsPanel.jsx`
- `App.jsx` with sidebar routing and role state

**What AI Got Wrong:**
- Grid rows set to 10 instead of 11 (for 275 seats)
- Tailwind v4 setup used old `tailwind.config.js` approach which doesn't work in v4
- `api.js` had hardcoded `localhost:8080` instead of env variable

**Manually Fixed:**
- Updated grid rows from 10 → 11
- Installed `@tailwindcss/vite` plugin, registered in `vite.config.js`
- Changed `API_BASE` to use `import.meta.env.VITE_API_BASE_URL`

---

## Prompt 7 – Testing

**Prompt Used:**
> "List manual test cases for the seat allocation system covering: seat allocation success, duplicate allocation prevention, seat release, role-based access (Employee cannot allocate), onboarding seat suggestion, AI query for employee seat lookup, AI query for floor occupancy, admin seed database."

**AI Generated:**
- Test case checklist for all major flows

**Manually Verified:**
- Tested all cases against live Swagger UI at `/docs`
- Confirmed 403 response when Employee tries to allocate
- Confirmed 400 response on duplicate seat allocation
- Confirmed AI correctly parses `"Where is EMP-10005 sitting?"` and returns seat details
- Confirmed analytics returns correct floor-by-floor occupancy rates after seeding

---

## Prompt 8 – Debugging

**Prompt Used:**
> "The seed endpoint is timing out on Render free tier with a 30 second limit. The floor plan page is loading very slowly. The analytics endpoint is slow. Help identify and fix these performance issues."

**AI Generated:**
- Suggested using FastAPI BackgroundTasks for seeding
- Suggested aggregated SQL queries for analytics

**What AI Got Wrong:**
- Background task was reusing the request's DB session which gets closed after response — caused `Instance has been deleted` error
- Used `db.connection()` which breaks outside request context

**Manually Fixed:**
- Created fresh `SessionLocal()` inside background task with `try/finally` cleanup
- Replaced `conn.execute()` with `db.execute()` throughout seed function
- Fixed `postgres://` → `postgresql://` URL prefix for SQLAlchemy compatibility
- Switched Supabase from port 5432 to 6543 (Shared Pooler) to fix IPv6 unreachable error on Render

---

## Prompt 9 – Deployment

**Prompt Used:**
> "Deploy FastAPI backend on Render free tier and React frontend on Vercel. Database is Supabase PostgreSQL. Backend needs DATABASE_URL and GEMINI_API_KEY environment variables. Frontend needs VITE_API_BASE_URL pointing to the Render backend URL. Provide render.yaml config and deployment steps."

**AI Generated:**
- `render.yaml` with build and start commands
- Deployment steps for both Render and Vercel

**What AI Got Wrong:**
- Did not add SSL config for Supabase connection
- Did not handle `postgres://` vs `postgresql://` prefix difference

**Manually Fixed:**
- Added `connect_args={"sslmode": "require"}` and `pool_pre_ping=True` to SQLAlchemy engine
- Added `postgres://` → `postgresql://` normalization in `database.py`
- Set `VITE_API_BASE_URL` as environment variable on Vercel dashboard

---

## Prompt 10 – Refactoring

**Prompt Used:**
> "Refactor the system to meet assessment requirements: update project names to Indigo, Indreed, Mydreed, Preed, Serfy, Oreed, Bedegreed, Opreed, Serry, Kaary, Mered. Increase total seats from 5,000 to 5,500 by changing seats per zone from 250 to 275. Add bay field to Seat model grouping every 25 seats into one bay (11 bays per zone). Add joining_date, created_at, updated_at fields to Employee model. Update seat code format to include bay: FL1-Z-A-B01-S001."

**AI Generated:**
- Updated `seed.py` with new project names and 5,500 seats
- Updated `models.py` with new fields
- Updated `schemas.py` with new fields

**Manually Verified:**
- Confirmed total seats = 5 × 4 × 275 = 5,500 ✅
- Confirmed bay correctly groups every 25 seats (11 bays per zone) ✅
- Confirmed all required project names present in seed data ✅
- Confirmed `joining_date`, `created_at`, `updated_at` returned in API response ✅
- Re-seeded production database and verified via `/api/analytics` endpoint ✅

---

## What AI Generated Correctly
- Overall system architecture and folder structure
- SQLAlchemy models and relationships
- FastAPI route structure with dependency injection
- Pydantic schemas for request/response validation
- Gemini API integration with regex fallback
- React component structure and dark/light mode
- Role-based access control pattern

## What AI Generated Incorrectly
- Wrong Gemini model name (`gemini-3.1-flash-lite` doesn't exist)
- N+1 query problems in seats and recommendations
- 25+ individual COUNT queries in analytics
- Hardcoded `localhost:8080` in frontend
- Missing `bay`, `joining_date`, `created_at`, `updated_at` fields
- No SSL config for Supabase
- Background task reusing closed DB session

## What Was Manually Fixed
- All N+1 query problems replaced with bulk JOIN queries
- Gemini model name corrected
- SSL and connection pooling added for Supabase
- Background seed task given fresh DB session
- Frontend API URL made configurable via env variable
- All missing model fields added
- Seat count increased to 5,500 with bay grouping
- Project names updated to match assessment requirements

## How Correctness Was Verified
- Tested all API endpoints via Swagger UI at `/docs`
- Verified seed data counts via `/api/analytics` response
- Tested role-based access by switching roles in frontend
- Tested AI assistant with multiple natural language queries
- Verified floor plan renders correct seat colors and occupant details
- Confirmed production deployment on Render + Vercel + Supabase
