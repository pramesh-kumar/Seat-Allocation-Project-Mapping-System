import datetime
import random
from sqlalchemy.orm import Session
from sqlalchemy import delete
from app import models, database

# List of typical names to generate realistic employees
FIRST_NAMES = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth",
    "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen",
    "Christopher", "Nancy", "Daniel", "Lisa", "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra",
    "Donald", "Ashley", "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
    "Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa", "Edward", "Deborah",
    "Ronald", "Stephanie", "Timothy", "Rebecca", "Jason", "Sharon", "Jeffrey", "Laura", "Ryan", "Cynthia",
    "Jacob", "Kathleen", "Gary", "Amy", "Nicholas", "Angela", "Eric", "Shirley", "Alexander", "Anna",
    "Stephen", "Brenda", "Jonathan", "Pamela", "Gregory", "Emma", "Raymond", "Nicole", "Benjamin", "Helen",
    "Patrick", "Samantha", "Jack", "Christine", "Alexander", "Debra", "Dennis", "Rachel", "Jerry", "Carolyn",
    "Tyler", "Janet", "Aaron", "Maria", "Jose", "Heather", "Adam", "Helen", "Nathan", "Catherine"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
    "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
    "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
    "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker", "Cruz", "Edwards", "Collins", "Reyes",
    "Stewart", "Morris", "Morales", "Murphy", "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper",
    "Peterson", "Bailey", "Reed", "Kelly", "Howard", "Ramos", "Kim", "Cox", "Ward", "Richardson",
    "Watson", "Brooks", "Chavez", "Wood", "James", "Bennett", "Gray", "Mendoza", "Ruiz", "Hughes"
]

DEPARTMENTS = {
    "Engineering": ["Software Engineer", "QA Engineer", "DevOps Engineer", "Engineering Manager", "VP of Engineering"],
    "Product": ["Product Manager", "UX Designer", "Product Lead", "Director of Product"],
    "Marketing": ["Marketing Specialist", "Growth Specialist", "SEO Analyst", "VP of Marketing"],
    "Finance": ["Accountant", "Finance Analyst", "Finance Director", "CFO"],
    "Operations": ["Operations Associate", "Operations Manager", "COO"],
    "HR": ["HR Associate", "HR Manager", "Recruiter", "VP of HR"],
    "Sales": ["Account Executive", "Sales Representative", "Sales Manager", "VP of Sales"],
    "Support": ["Customer Support Agent", "Support Team Lead", "Support Manager"]
}

PROJECTS_DATA = [
    ("PRJ-APOLLO", "Project Apollo", "Engineering"),
    ("PRJ-PHOENIX", "Project Phoenix", "Engineering"),
    ("PRJ-TITAN", "Project Titan", "Engineering"),
    ("PRJ-ORION", "Project Orion", "Engineering"),
    ("PRJ-GENESIS", "Project Genesis", "Product"),
    ("PRJ-NEXUS", "Project Nexus", "Product"),
    ("PRJ-VANGUARD", "Project Vanguard", "Operations"),
    ("PRJ-SYNERGY", "Project Synergy", "Operations"),
    ("PRJ-ECLIPSE", "Project Eclipse", "Marketing"),
    ("PRJ-HORIZON", "Project Horizon", "Marketing"),
    ("PRJ-SUMMIT", "Project Summit", "Sales"),
    ("PRJ-BEACON", "Project Beacon", "Sales"),
    ("PRJ-ODYSSEY", "Project Odyssey", "Finance"),
    ("PRJ-VELOCITY", "Project Velocity", "Engineering"),
    ("PRJ-AURORA", "Project Aurora", "Engineering"),
    ("PRJ-VALKYRIE", "Project Valkyrie", "Engineering"),
    ("PRJ-GALAXY", "Project Galaxy", "Product"),
    ("PRJ-ZENITH", "Project Zenith", "Operations"),
    ("PRJ-PULSE", "Project Pulse", "HR"),
    ("PRJ-SHIELD", "Project Shield", "Finance")
]

def seed_database(db: Session):
    print("Clearing database...")
    # Delete in order of constraints
    db.query(models.SeatAllocation).delete()
    db.query(models.EmployeeProject).delete()
    db.query(models.Employee).delete()
    db.query(models.Project).delete()
    db.query(models.Seat).delete()
    db.commit()

    print("Generating 5,000 seats...")
    # 5 floors * 4 zones * 250 seats = 5,000 seats
    seats_to_insert = []
    seat_map = {}  # key: (floor, zone, number), value: seat_obj
    
    id_counter = 1
    for floor in range(1, 6):
        for zone in ["A", "B", "C", "D"]:
            for number in range(1, 251):
                seat_code = f"FL{floor}-Z-{zone}-S{number:03d}"
                seat = models.Seat(
                    id=id_counter,
                    seat_code=seat_code,
                    floor=floor,
                    zone=zone,
                    number=number,
                    status="AVAILABLE"
                )
                seats_to_insert.append(seat)
                seat_map[(floor, zone, number)] = seat
                id_counter += 1
                
    db.bulk_save_objects(seats_to_insert)
    db.commit()
    print(f"Seeded {len(seats_to_insert)} seats.")

    print("Generating projects...")
    projects_list = []
    for code, name, dept in PROJECTS_DATA:
        manager = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        proj = models.Project(
            project_code=code,
            name=name,
            department=dept,
            manager_name=manager,
            start_date=datetime.date(2025, 1, 1),
            end_date=datetime.date(2027, 12, 31)
        )
        db.add(proj)
        projects_list.append(proj)
    db.commit()
    print(f"Seeded {len(projects_list)} projects.")

    # Re-fetch projects to get their database IDs
    db_projects = db.query(models.Project).all()
    project_by_dept = {}
    for p in db_projects:
        if p.department not in project_by_dept:
            project_by_dept[p.department] = []
        project_by_dept[p.department].append(p)

    print("Generating 5,000 employees...")
    employees_to_insert = []
    
    # 100 Onboarding (new joiners)
    # 100 Exited
    # 4,800 Active
    statuses = ["ACTIVE"] * 4800 + ["ONBOARDING"] * 100 + ["EXITED"] * 100
    random.shuffle(statuses)
    
    # Pre-generate unique combinations or append ID to avoid conflicts
    used_emails = set()
    used_emp_ids = set()
    
    for i in range(1, 5001):
        emp_id = f"EMP-{10000 + i}"
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        
        email = f"{first_name.lower()}.{last_name.lower()}{i}@ethara.com"
        
        dept = random.choice(list(DEPARTMENTS.keys()))
        role = random.choice(DEPARTMENTS[dept])
        status = statuses[i - 1]
        
        emp = models.Employee(
            id=i,
            employee_id=emp_id,
            first_name=first_name,
            last_name=last_name,
            email=email,
            department=dept,
            role=role,
            status=status
        )
        employees_to_insert.append(emp)
        
    db.bulk_save_objects(employees_to_insert)
    db.commit()
    print(f"Seeded {len(employees_to_insert)} employees.")

    print("Assigning employees to projects...")
    ep_mappings = []
    # We will map employees to projects based on their department
    # Non-onboarding/exited employees should be assigned a project
    db_employees = db.query(models.Employee).all()
    
    active_employees_with_projects = []
    for emp in db_employees:
        if emp.status == "ACTIVE":
            depts_projects = project_by_dept.get(emp.department, [])
            if depts_projects:
                proj = random.choice(depts_projects)
                ep = models.EmployeeProject(
                    employee_id=emp.id,
                    project_id=proj.id,
                    is_primary=True
                )
                ep_mappings.append(ep)
                active_employees_with_projects.append((emp, proj))
                
    db.bulk_save_objects(ep_mappings)
    db.commit()
    print(f"Seeded {len(ep_mappings)} employee-project mappings.")

    print("Allocating seats in clustered layouts...")
    # Group employees by project to seat them together
    project_groups = {}
    for emp, proj in active_employees_with_projects:
        if proj.id not in project_groups:
            project_groups[proj.id] = []
        project_groups[proj.id].append(emp)

    # We will assign each project group a specific floor and zone, and seat them in adjacent seats
    # We have 5 floors * 4 zones = 20 locations. We have 20 projects!
    # Perfect mapping: Project 1 -> Floor 1 Zone A, Project 2 -> Floor 1 Zone B, etc.
    # If a project has more than 250 members, it spills over to the next zone/floor.
    # If fewer than 250 members, the remaining seats are left available.
    
    locations = []
    for floor in range(1, 6):
        for zone in ["A", "B", "C", "D"]:
            locations.append((floor, zone))
            
    allocations_to_insert = []
    updated_seats = []
    
    # We want to seat project groups first
    location_index = 0
    
    for proj_id, group in project_groups.items():
        if location_index >= len(locations):
            location_index = 0  # Wrap around if needed, but we have 20 locations and 20 projects
            
        floor, zone = locations[location_index]
        location_index += 1
        
        seat_num = 1
        for emp in group:
            # Look for next available seat in this floor/zone
            while seat_num <= 250:
                seat_obj = seat_map.get((floor, zone, seat_num))
                if seat_obj and seat_obj.status == "AVAILABLE":
                    # Allocate seat
                    seat_obj.status = "OCCUPIED"
                    updated_seats.append(seat_obj)
                    
                    alloc = models.SeatAllocation(
                        employee_id=emp.id,
                        seat_id=seat_obj.id,
                        allocated_by="SYSTEM",
                        allocated_at=datetime.datetime.utcnow() - datetime.timedelta(days=random.randint(10, 100))
                    )
                    allocations_to_insert.append(alloc)
                    seat_num += 1
                    break
                seat_num += 1
                
    # Now we need to save the allocations and update seat statuses
    # We can bulk update seats status and bulk save allocations
    db.bulk_save_objects(allocations_to_insert)
    db.commit()
    
    # Refresh/update seat statuses in the database
    occupied_seat_ids = [s.id for s in updated_seats]
    if occupied_seat_ids:
        db.query(models.Seat).filter(models.Seat.id.in_(occupied_seat_ids)).update(
            {"status": "OCCUPIED"}, synchronize_session=False
        )
    db.commit()
    

    print(f"Allocated {len(allocations_to_insert)} seats to project members.")

    print("Adding some reserved and maintenance seats...")
    # Find remaining AVAILABLE seats
    available_seats = db.query(models.Seat).filter(models.Seat.status == "AVAILABLE").all()
    print(f"Available seats before adjustments: {len(available_seats)}")
    
    # Mark ~150 seats as RESERVED, ~100 as MAINTENANCE
    random.shuffle(available_seats)
    reserved_count = min(150, len(available_seats))
    maint_count = min(100, len(available_seats) - reserved_count)
    
    for s in available_seats[:reserved_count]:
        s.status = "RESERVED"
    for s in available_seats[reserved_count : reserved_count + maint_count]:
        s.status = "MAINTENANCE"
        
    db.commit()
    print(f"Adjusted seating: Reserved {reserved_count} seats, Maintenance {maint_count} seats.")
    
    final_avail = db.query(models.Seat).filter(models.Seat.status == "AVAILABLE").count()
    final_occ = db.query(models.Seat).filter(models.Seat.status == "OCCUPIED").count()
    final_res = db.query(models.Seat).filter(models.Seat.status == "RESERVED").count()
    final_maint = db.query(models.Seat).filter(models.Seat.status == "MAINTENANCE").count()
    print(f"Final seating counts - Occupied: {final_occ}, Available: {final_avail}, Reserved: {final_res}, Maintenance: {final_maint}")
    print("Database seeding completed successfully!")
