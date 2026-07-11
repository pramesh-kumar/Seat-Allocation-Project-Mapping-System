# AI Prompts & Development Journal

This journal documents all AI interactions, generated architectures, manual fixes, and validation methods used to build the **Ethara Seat Allocation & Project Mapping System**.

---

## 🗺 Development Methodology

The system was generated incrementally using advanced AI coding prompts, separating the concerns into a backend FastAPI database/API service and a frontend React Single-Page Application (SPA). Below is the log of prompts, outputs, fixes, and tests.

---

## ✍️ Interaction Journal

### 1. Database & Schema Architecture
* **Prompt Purpose:** Define SQLAlchemy ORM models, relationships, and Pydantic validation schemas to support Employees (5,000), Seats (5,000), Projects (20+), and Allocation records.
* **AI Output Generated:** 
  * `database.py`: Establishes engine connections. Enforces `PRAGMA foreign_keys=ON` on SQLite.
  * `models.py`: Sets up constraints (`UniqueConstraint` on project mapping, indexing on departments/floors/zones).
  * `schemas.py`: Formulates data serialization schemas (such as overall utilization aggregates).
* **Manual Fix Applied:** None. Schema compilation completed successfully.

### 2. High-Performance Database Seeding
* **Prompt Purpose:** Generate 5,000 seats distributed over 5 floors (1,000 seats per floor, 4 zones of 250 seats each). Seed 20+ projects and 5,000 employees. Group employees by project and allocate their seats sequentially inside the same floor/zone to create physical "office bays". Set portions of seats to AVAILABLE, RESERVED, or MAINTENANCE.
* **AI Output Generated:** `seed.py` generating random employee records and allocating them in sequential loops based on project groupings.
* **Manual Fix Applied (CRITICAL):**
  * *Bug:* Executing the seeding script threw a `UNIQUE constraint failed: seats.id` SQLite IntegrityError.
  * *Cause:* The seat objects were saved using `db.bulk_save_objects(seats_to_insert)`. This method does not associate the objects with the Session. When they were updated to `OCCUPIED` and committed via a loop calling `db.add(seat)`, SQLAlchemy attempted to run standard `INSERT` queries instead of `UPDATE` queries.
  * *Fix:* Replaced the `db.add` loop with a single bulk query update:
    ```python
    occupied_seat_ids = [s.id for s in updated_seats]
    if occupied_seat_ids:
        db.query(models.Seat).filter(models.Seat.id.in_(occupied_seat_ids)).update(
            {"status": "OCCUPIED"}, synchronize_session=False
        )
    db.commit()
    ```
    This resolved the IntegrityError and reduced seed time to under 1 second.

### 3. API Endpoints & Role-Based Authorization
* **Prompt Purpose:** Implement FastAPI routes with query decorators and path operations. Simulates role authorization checking an `X-User-Role` request header. 
* **AI Output Generated:** 
  * `auth.py`: Dependency validator comparing current roles (`Employee`, `HR`, `Project Lead`, `Admin`) against endpoint requirements.
  * `routes/employees.py`, `routes/projects.py`, `routes/seats.py`, `routes/analytics.py`.
* **Manual Fix Applied:**
  * *Bug:* Uvicorn server failed to boot on port 8000 with `[Errno 98] Address already in use`.
  * *Fix:* Updated port binding in `run.py` to port `8080`.

### 4. Natural Language AI Assistant Query Engine & LLM Upgrade
* **Prompt Purpose:** Construct an NLP Query parser in the backend (`ai_parser.py`) supporting both a rule-based regex pre-parser and a Google Gemini API semantic parser.
* **AI Output Generated:** `ai_parser.py` and `routes/ai.py`. It reads a `GEMINI_API_KEY` from the backend `.env` file and executes structured intent and entity extraction using the `gemini-3.1-flash-lite` model.
* **Manual Fixes Applied:** 
  1. Enforced role-based access control check inside the parser itself.
  2. Implemented a robust fallback mechanism that automatically falls back to regex matching if the API key is absent or network requests time out.
  3. Pre-cleaned user query strings of list items, hyphens, and surrounding quotes to ensure that copy-pasting suggested prompts does not break regex captures.
  4. Expanded query intents to support project manager queries (e.g. *"Who is collxa project manager?"*), utilizing prefix cleaning to prevent false namespace overlaps against Project Apollo.

### 5. Frontend Scaffold & Tailwind v4 Setup
* **Prompt Purpose:** Initialize a React Vite project. Set up Tailwind CSS for styling.
* **AI Output Generated:** Standard Vite React template.
* **Manual Fix Applied (CRITICAL):**
  * *Bug:* Running `npx tailwindcss init -p` crashed with `npm error could not determine executable to run`.
  * *Cause:* The package manager installed **Tailwind CSS v4** (`tailwindcss: ^4.3.2`). Tailwind v4 does not use `tailwind.config.js` or `postcss.config.js` by default. Instead, it compiles assets via the `@import "tailwindcss";` direct CSS directive and integrates with bundlers using compiler plugins.
  * *Fix:* 
    1. Installed `@tailwindcss/vite` plugin (`npm install @tailwindcss/vite`).
    2. Registered the plugin inside `vite.config.js`:
       ```javascript
       import { defineConfig } from 'vite';
       import react from '@vitejs/plugin-react';
       import tailwindcss from '@tailwindcss/vite';
       export default defineConfig({
         plugins: [react(), tailwindcss()],
       });
       ```
    3. Defined design tokens (colors, animations, fonts) directly inside `src/index.css` using the `@theme` directive.

### 6. Interactive Floor Plan Grid
* **Prompt Purpose:** Build an interactive grid representing 250 desks. Style it with glassmorphism CSS. Allow seat selections, occupant hover tooltips, and action drawers.
* **AI Output Generated:** `FloorPlan.jsx`.
* **Manual Fix Applied:** Added two `useEffect` listeners to sync state with parameters passed from parent components (e.g. `externalFloor`, `externalZone`, `externalSeatCode`). If the AI Assistant query returns a seat, the floor plan automatically transitions views and highlights the seat card.

### 7. Dual Dark/Light Mode Theme Switching
* **Prompt Purpose:** Add a light/dark mode switcher to the header navbar using Sun/Moon icons, persistent `localStorage` session state, and responsive styles that display beautifully on both white/grey light themes and slate-dark designs.
* **AI Output Generated:** Header button mapping with conditional icon rendering in `App.jsx`.
* **Manual Fix Applied:** 
  * *CSS Variables Theme Configuration:* Defined variable colors (`--bg-dark`, `--bg-card`, `--border-color`, `--text-main`, etc.) inside `src/index.css` and bound them under the `@theme` directive.
  * *Tailwind v4 Variant Integration:* Registered `@custom-variant dark (&:where(.dark, .dark *));` inside `src/index.css` to enable class-based overrides (`dark:`) for HSL tints, sidebar containers, and specific text styles.
  * *Responsive Component Classes:* Updated text tags (e.g. `text-slate-100` -> `text-slate-800 dark:text-slate-105`) and background overlays (e.g. `bg-slate-900/60` -> `bg-slate-50 dark:bg-slate-900/60`) in all frontend components (`FloorPlan.jsx`, `StatsDashboard.jsx`, `SeatingTable.jsx`, `OnboardingPanel.jsx`, and `AiChatPanel.jsx`).

---

## 🔍 Validation & Verification Summary

To verify system integrity, the following validation methods were executed:

### 1. Database & Seeding Verification
* **Method:** Sent a seeding request to the local API:
  ```bash
  curl -X POST -H "X-User-Role: Admin" http://localhost:8080/api/seed
  ```
* **Result:** Database populated 5,000 employees, 5,000 seats, and 20 projects.
* **Seating Balance Check (from `/api/analytics`):**
  * Total Seats: 5000
  * Active occupied seats: 3493
  * Seating occupancy rate: 69.86%
  * Floor-by-floor occupancy: Range from 49.1% (Floor 2) to 100.0% (Floor 3).

### 2. AI Query Parsing
* **Method:** Asked the assistant: `"Where is EMP-10005 sitting?"`
* **Result:** Successfully parsed the employee ID, matched `find_employee_seat` intent, located seat "FL1-Z-B-S002", and returned the formatted JSON payload.

### 3. Production Build, Roster Modals, & Navigation Check
* **Method:** Compiled React assets for production (`npm run build`), tested the dark/light toggle states, clicked project cards to view roster details, and ran AI queries requesting seating navigations.
* **Result:** 
  * Frontend built successfully in under `800ms`.
  * The Sun/Moon toggle button correctly appends/removes the `.dark` class from the `<html>` root, causing all components (Dashboard, Floor Plan, Employee Table, Onboarding panel, and Chatbot panel) to switch color themes instantly and smoothly.
  * Visual navigation is robust: when an AI query redirects the view to a specific floor/zone, the state is seeded directly into the mount props, and older async queries are discarded via cancellation cleanup flags, preventing visual flickering or outdated layouts.
  * Projects grid supports clicks to open modal dialog overlays listing assigned employees, their specific seat codes, and quick management hooks to assign/remove team members.
  * Setting a query limit pagination filter is safe: the backend enforces `le=100` constraints, which is handled on the frontend via typeahead input autocompletion queries fetching matching subsets in real-time.
