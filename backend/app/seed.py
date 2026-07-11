import datetime
import random
from sqlalchemy.orm import Session
from sqlalchemy import text

FIRST_NAMES = [
    "James","Mary","John","Patricia","Robert","Jennifer","Michael","Linda","William","Elizabeth",
    "David","Barbara","Richard","Susan","Joseph","Jessica","Thomas","Sarah","Charles","Karen",
    "Christopher","Nancy","Daniel","Lisa","Matthew","Betty","Anthony","Margaret","Mark","Sandra",
    "Donald","Ashley","Steven","Kimberly","Paul","Emily","Andrew","Donna","Joshua","Michelle",
    "Kenneth","Dorothy","Kevin","Carol","Brian","Amanda","George","Melissa","Edward","Deborah",
    "Ronald","Stephanie","Timothy","Rebecca","Jason","Sharon","Jeffrey","Laura","Ryan","Cynthia",
    "Jacob","Kathleen","Gary","Amy","Nicholas","Angela","Eric","Shirley","Alexander","Anna",
    "Stephen","Brenda","Jonathan","Pamela","Gregory","Emma","Raymond","Nicole","Benjamin","Helen",
    "Patrick","Samantha","Jack","Christine","Dennis","Debra","Rachel","Carolyn",
    "Tyler","Janet","Aaron","Maria","Jose","Heather","Adam","Nathan","Catherine","Diane"
]

LAST_NAMES = [
    "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
    "Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin",
    "Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson",
    "Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores",
    "Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts",
    "Gomez","Phillips","Evans","Turner","Diaz","Parker","Cruz","Edwards","Collins","Reyes",
    "Stewart","Morris","Morales","Murphy","Cook","Rogers","Gutierrez","Ortiz","Morgan","Cooper",
    "Peterson","Bailey","Reed","Kelly","Howard","Ramos","Kim","Cox","Ward","Richardson",
    "Watson","Brooks","Chavez","Wood","James","Bennett","Gray","Mendoza","Ruiz","Hughes"
]

DEPARTMENTS = {
    "Engineering": ["Software Engineer","QA Engineer","DevOps Engineer","Engineering Manager","VP of Engineering"],
    "Product":     ["Product Manager","UX Designer","Product Lead","Director of Product"],
    "Marketing":   ["Marketing Specialist","Growth Specialist","SEO Analyst","VP of Marketing"],
    "Finance":     ["Accountant","Finance Analyst","Finance Director","CFO"],
    "Operations":  ["Operations Associate","Operations Manager","COO"],
    "HR":          ["HR Associate","HR Manager","Recruiter","VP of HR"],
    "Sales":       ["Account Executive","Sales Representative","Sales Manager","VP of Sales"],
    "Support":     ["Customer Support Agent","Support Team Lead","Support Manager"],
}

PROJECTS_DATA = [
    ("PRJ-APOLLO",   "Project Apollo",   "Engineering"),
    ("PRJ-PHOENIX",  "Project Phoenix",  "Engineering"),
    ("PRJ-TITAN",    "Project Titan",    "Engineering"),
    ("PRJ-ORION",    "Project Orion",    "Engineering"),
    ("PRJ-GENESIS",  "Project Genesis",  "Product"),
    ("PRJ-NEXUS",    "Project Nexus",    "Product"),
    ("PRJ-VANGUARD", "Project Vanguard", "Operations"),
    ("PRJ-SYNERGY",  "Project Synergy",  "Operations"),
    ("PRJ-ECLIPSE",  "Project Eclipse",  "Marketing"),
    ("PRJ-HORIZON",  "Project Horizon",  "Marketing"),
    ("PRJ-SUMMIT",   "Project Summit",   "Sales"),
    ("PRJ-BEACON",   "Project Beacon",   "Sales"),
    ("PRJ-ODYSSEY",  "Project Odyssey",  "Finance"),
    ("PRJ-VELOCITY", "Project Velocity", "Engineering"),
    ("PRJ-AURORA",   "Project Aurora",   "Engineering"),
    ("PRJ-VALKYRIE", "Project Valkyrie", "Engineering"),
    ("PRJ-GALAXY",   "Project Galaxy",   "Product"),
    ("PRJ-ZENITH",   "Project Zenith",   "Operations"),
    ("PRJ-PULSE",    "Project Pulse",    "HR"),
    ("PRJ-SHIELD",   "Project Shield",   "Finance"),
]


def seed_database(db: Session):
    conn = db.connection()

    # 1. Clear all tables
    conn.execute(text("DELETE FROM seat_allocations"))
    conn.execute(text("DELETE FROM employee_projects"))
    conn.execute(text("DELETE FROM employees"))
    conn.execute(text("DELETE FROM projects"))
    conn.execute(text("DELETE FROM seats"))
    db.commit()

    # 2. Seats — 5 floors × 4 zones × 250 = 5,000
    seat_rows = []
    seat_id = 1
    seat_map = {}
    for floor in range(1, 6):
        for zone in ["A", "B", "C", "D"]:
            for number in range(1, 251):
                seat_rows.append({
                    "id": seat_id,
                    "seat_code": f"FL{floor}-Z-{zone}-S{number:03d}",
                    "floor": floor, "zone": zone,
                    "number": number, "status": "AVAILABLE"
                })
                seat_map[(floor, zone, number)] = seat_id
                seat_id += 1

    conn.execute(
        text("INSERT INTO seats (id,seat_code,floor,zone,number,status) "
             "VALUES (:id,:seat_code,:floor,:zone,:number,:status)"),
        seat_rows
    )
    db.commit()

    # 3. Projects
    project_rows = []
    for pid, (code, name, dept) in enumerate(PROJECTS_DATA, start=1):
        project_rows.append({
            "id": pid, "project_code": code, "name": name,
            "department": dept,
            "manager_name": f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
            "start_date": "2025-01-01", "end_date": "2027-12-31"
        })

    conn.execute(
        text("INSERT INTO projects (id,project_code,name,department,manager_name,start_date,end_date) "
             "VALUES (:id,:project_code,:name,:department,:manager_name,:start_date,:end_date)"),
        project_rows
    )
    db.commit()

    project_by_dept: dict[str, list[int]] = {}
    for p in project_rows:
        project_by_dept.setdefault(p["department"], []).append(p["id"])

    # 4. Employees — 5,000
    statuses = ["ACTIVE"] * 4800 + ["ONBOARDING"] * 100 + ["EXITED"] * 100
    random.shuffle(statuses)
    dept_keys = list(DEPARTMENTS.keys())

    employee_rows = []
    for i in range(1, 5001):
        fn = random.choice(FIRST_NAMES)
        ln = random.choice(LAST_NAMES)
        dept = random.choice(dept_keys)
        employee_rows.append({
            "id": i,
            "employee_id": f"EMP-{10000 + i}",
            "first_name": fn, "last_name": ln,
            "email": f"{fn.lower()}.{ln.lower()}{i}@ethara.com",
            "department": dept,
            "role": random.choice(DEPARTMENTS[dept]),
            "status": statuses[i - 1],
        })

    conn.execute(
        text("INSERT INTO employees (id,employee_id,first_name,last_name,email,department,role,status) "
             "VALUES (:id,:employee_id,:first_name,:last_name,:email,:department,:role,:status)"),
        employee_rows
    )
    db.commit()

    # 5. Employee-Project mappings
    ep_rows = []
    ep_id = 1
    active_by_project: dict[int, list[int]] = {}

    for emp in employee_rows:
        if emp["status"] != "ACTIVE":
            continue
        proj_ids = project_by_dept.get(emp["department"], [])
        if not proj_ids:
            continue
        proj_id = random.choice(proj_ids)
        ep_rows.append({"id": ep_id, "employee_id": emp["id"], "project_id": proj_id, "is_primary": True})
        active_by_project.setdefault(proj_id, []).append(emp["id"])
        ep_id += 1

    conn.execute(
        text("INSERT INTO employee_projects (id,employee_id,project_id,is_primary) "
             "VALUES (:id,:employee_id,:project_id,:is_primary)"),
        ep_rows
    )
    db.commit()

    # 6. Seat allocations — cluster by project
    locations = [(f, z) for f in range(1, 6) for z in ["A", "B", "C", "D"]]
    alloc_rows = []
    occupied_seat_ids = set()
    alloc_id = 1
    base_dt = datetime.datetime.utcnow()

    for loc_idx, (proj_id, emp_ids) in enumerate(active_by_project.items()):
        floor, zone = locations[loc_idx % len(locations)]
        seat_num = 1
        for emp_id in emp_ids:
            while seat_num <= 250:
                sid = seat_map.get((floor, zone, seat_num))
                if sid and sid not in occupied_seat_ids:
                    occupied_seat_ids.add(sid)
                    alloc_rows.append({
                        "id": alloc_id, "employee_id": emp_id, "seat_id": sid,
                        "allocated_by": "SYSTEM",
                        "allocated_at": (base_dt - datetime.timedelta(days=random.randint(10, 100))).isoformat(),
                        "released_at": None,
                    })
                    alloc_id += 1
                    seat_num += 1
                    break
                seat_num += 1

    if alloc_rows:
        conn.execute(
            text("INSERT INTO seat_allocations (id,employee_id,seat_id,allocated_by,allocated_at,released_at) "
                 "VALUES (:id,:employee_id,:seat_id,:allocated_by,:allocated_at,:released_at)"),
            alloc_rows
        )

    if occupied_seat_ids:
        conn.execute(
            text("UPDATE seats SET status='OCCUPIED' WHERE id = ANY(:ids)"),
            {"ids": list(occupied_seat_ids)}
        )
    db.commit()

    # 7. Mark RESERVED / MAINTENANCE
    conn.execute(text(
        "UPDATE seats SET status='RESERVED' WHERE id IN "
        "(SELECT id FROM seats WHERE status='AVAILABLE' ORDER BY random() LIMIT 150)"
    ))
    conn.execute(text(
        "UPDATE seats SET status='MAINTENANCE' WHERE id IN "
        "(SELECT id FROM seats WHERE status='AVAILABLE' ORDER BY random() LIMIT 100)"
    ))
    db.commit()
    print("Database seeding completed successfully!")
