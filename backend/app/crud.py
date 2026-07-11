import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from app import models, schemas
from typing import List, Optional

# --- Employee CRUD ---
def get_employee(db: Session, employee_id: int):
    return db.query(models.Employee).filter(models.Employee.id == employee_id).first()

def get_employee_by_code(db: Session, employee_id_code: str):
    return db.query(models.Employee).filter(models.Employee.employee_id == employee_id_code).first()

def get_employee_by_email(db: Session, email: str):
    return db.query(models.Employee).filter(models.Employee.email == email).first()

def get_employees(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    project_id: Optional[int] = None
):
    query = db.query(models.Employee)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                models.Employee.first_name.like(search_term),
                models.Employee.last_name.like(search_term),
                models.Employee.email.like(search_term),
                models.Employee.employee_id.like(search_term)
            )
        )
    
    if department:
        query = query.filter(models.Employee.department == department)
        
    if status:
        query = query.filter(models.Employee.status == status)
        
    if project_id:
        query = query.join(models.EmployeeProject).filter(models.EmployeeProject.project_id == project_id)
        
    # Order by ID
    return query.order_by(models.Employee.id).offset(skip).limit(limit).all()

def get_employees_count(
    db: Session,
    search: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    project_id: Optional[int] = None
) -> int:
    query = db.query(func.count(models.Employee.id))
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                models.Employee.first_name.like(search_term),
                models.Employee.last_name.like(search_term),
                models.Employee.email.like(search_term),
                models.Employee.employee_id.like(search_term)
            )
        )
    if department:
        query = query.filter(models.Employee.department == department)
    if status:
        query = query.filter(models.Employee.status == status)
    if project_id:
        query = query.join(models.EmployeeProject).filter(models.EmployeeProject.project_id == project_id)
    return query.scalar()

def create_employee(db: Session, employee: schemas.EmployeeCreate):
    db_employee = models.Employee(
        employee_id=employee.employee_id,
        first_name=employee.first_name,
        last_name=employee.last_name,
        email=employee.email,
        department=employee.department,
        role=employee.role,
        status=employee.status
    )
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee

def update_employee(db: Session, employee_id: int, employee_update: schemas.EmployeeUpdate):
    db_employee = get_employee(db, employee_id)
    if not db_employee:
        return None
    
    update_data = employee_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_employee, key, value)
        
    db.commit()
    db.refresh(db_employee)
    return db_employee

def delete_employee(db: Session, employee_id: int):
    db_employee = get_employee(db, employee_id)
    if not db_employee:
        return False
    # Release seat allocation if any
    active_allocation = db.query(models.SeatAllocation).filter(
        models.SeatAllocation.employee_id == employee_id,
        models.SeatAllocation.released_at.is_(None)
    ).first()
    if active_allocation:
        release_seat(db, active_allocation.seat_id)
        
    db.delete(db_employee)
    db.commit()
    return True


# --- Project CRUD ---
def get_project(db: Session, project_id: int):
    return db.query(models.Project).filter(models.Project.id == project_id).first()

def get_project_by_code(db: Session, project_code: str):
    return db.query(models.Project).filter(models.Project.project_code == project_code).first()

def get_projects(db: Session, skip: int = 0, limit: int = 100, search: Optional[str] = None):
    query = db.query(models.Project)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                models.Project.name.like(search_term),
                models.Project.project_code.like(search_term),
                models.Project.department.like(search_term)
            )
        )
    return query.offset(skip).limit(limit).all()

def create_project(db: Session, project: schemas.ProjectCreate):
    db_project = models.Project(
        project_code=project.project_code,
        name=project.name,
        department=project.department,
        manager_name=project.manager_name,
        start_date=project.start_date,
        end_date=project.end_date
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def update_project(db: Session, project_id: int, project_update: schemas.ProjectUpdate):
    db_project = get_project(db, project_id)
    if not db_project:
        return None
    
    update_data = project_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_project, key, value)
        
    db.commit()
    db.refresh(db_project)
    return db_project

def assign_employee_to_project(db: Session, employee_id: int, project_id: int, is_primary: bool = True):
    # Check if already assigned
    existing = db.query(models.EmployeeProject).filter(
        models.EmployeeProject.employee_id == employee_id,
        models.EmployeeProject.project_id == project_id
    ).first()
    if existing:
        existing.is_primary = is_primary
        db.commit()
        return existing
        
    # If is_primary is True, set other assignments to False
    if is_primary:
        db.query(models.EmployeeProject).filter(
            models.EmployeeProject.employee_id == employee_id
        ).update({"is_primary": False})
        
    db_ep = models.EmployeeProject(employee_id=employee_id, project_id=project_id, is_primary=is_primary)
    db.add(db_ep)
    db.commit()
    db.refresh(db_ep)
    return db_ep

def remove_employee_from_project(db: Session, employee_id: int, project_id: int):
    db_ep = db.query(models.EmployeeProject).filter(
        models.EmployeeProject.employee_id == employee_id,
        models.EmployeeProject.project_id == project_id
    ).first()
    if not db_ep:
        return False
    db.delete(db_ep)
    db.commit()
    return True


# --- Seat CRUD ---
def get_seat(db: Session, seat_id: int):
    return db.query(models.Seat).filter(models.Seat.id == seat_id).first()

def get_seat_by_code(db: Session, seat_code: str):
    return db.query(models.Seat).filter(models.Seat.seat_code == seat_code).first()

def get_seats(
    db: Session,
    floor: Optional[int] = None,
    zone: Optional[str] = None,
    status: Optional[str] = None,
    project_id: Optional[int] = None
):
    query = db.query(models.Seat)
    if floor is not None:
        query = query.filter(models.Seat.floor == floor)
    if zone:
        query = query.filter(models.Seat.zone == zone)
    if status:
        query = query.filter(models.Seat.status == status)
        
    if project_id:
        # Get employees on project
        emp_ids = [e.employee_id for e in db.query(models.EmployeeProject).filter(models.EmployeeProject.project_id == project_id).all()]
        # Get active allocations for these employees
        seat_ids = [a.seat_id for a in db.query(models.SeatAllocation).filter(
            models.SeatAllocation.employee_id.in_(emp_ids),
            models.SeatAllocation.released_at.is_(None)
        ).all()]
        query = query.filter(models.Seat.id.in_(seat_ids))
        
    return query.order_by(models.Seat.seat_code).all()

def update_seat_status(db: Session, seat_id: int, status: str):
    db_seat = get_seat(db, seat_id)
    if not db_seat:
        return None
    db_seat.status = status
    db.commit()
    db.refresh(db_seat)
    return db_seat


# --- Allocation CRUD ---
def allocate_seat(db: Session, employee_id: int, seat_id: int, allocated_by: str = "SYSTEM"):
    db_seat = get_seat(db, seat_id)
    db_employee = get_employee(db, employee_id)
    
    if not db_seat or not db_employee:
        return None
        
    # Check if seat is currently occupied or maintenance
    if db_seat.status in ["OCCUPIED", "MAINTENANCE"]:
        return None
        
    # 1. Release employee's current active seat if any
    current_allocation = db.query(models.SeatAllocation).filter(
        models.SeatAllocation.employee_id == employee_id,
        models.SeatAllocation.released_at.is_(None)
    ).first()
    
    if current_allocation:
        # Set released_at and mark seat as AVAILABLE
        current_allocation.released_at = datetime.datetime.utcnow()
        current_seat = db.query(models.Seat).filter(models.Seat.id == current_allocation.seat_id).first()
        if current_seat:
            current_seat.status = "AVAILABLE"
            
    # 2. Assign the new seat
    db_seat.status = "OCCUPIED"
    new_allocation = models.SeatAllocation(
        employee_id=employee_id,
        seat_id=seat_id,
        allocated_by=allocated_by,
        allocated_at=datetime.datetime.utcnow()
    )
    db.add(new_allocation)
    db.commit()
    db.refresh(new_allocation)
    return new_allocation

def release_seat(db: Session, seat_id: int):
    # Find active allocation
    allocation = db.query(models.SeatAllocation).filter(
        models.SeatAllocation.seat_id == seat_id,
        models.SeatAllocation.released_at.is_(None)
    ).first()
    
    db_seat = get_seat(db, seat_id)
    if db_seat:
        db_seat.status = "AVAILABLE"
        
    if allocation:
        allocation.released_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(allocation)
        return allocation
        
    db.commit()
    return None


# --- Proximity Recommendations ---
def get_seat_recommendations(db: Session, employee_id: int, limit: int = 5) -> List[models.Seat]:
    employee = get_employee(db, employee_id)
    if not employee:
        return []
        
    # Find active project mapping
    primary_project = db.query(models.EmployeeProject).filter(
        models.EmployeeProject.employee_id == employee_id,
        models.EmployeeProject.is_primary == True
    ).first()
    
    teammate_allocations = []
    if primary_project:
        # Get other teammates who have active seat allocations
        teammate_allocations = db.query(models.SeatAllocation).join(models.Employee).join(models.EmployeeProject).filter(
            models.EmployeeProject.project_id == primary_project.project_id,
            models.Employee.id != employee_id,
            models.SeatAllocation.released_at.is_(None)
        ).all()
        
    # If no project teammates sit anywhere, look for department members
    if not teammate_allocations:
        teammate_allocations = db.query(models.SeatAllocation).join(models.Employee).filter(
            models.Employee.department == employee.department,
            models.Employee.id != employee_id,
            models.SeatAllocation.released_at.is_(None)
        ).all()
        
    # Group teammate seats by Floor + Zone to find the most popular areas
    location_weights = {}  # key: (floor, zone), value: list of seat numbers
    for alloc in teammate_allocations:
        seat = db.query(models.Seat).filter(models.Seat.id == alloc.seat_id).first()
        if seat:
            key = (seat.floor, seat.zone)
            if key not in location_weights:
                location_weights[key] = []
            location_weights[key].append(seat.number)
            
    # Sort locations by the number of teammates sitting there (descending)
    sorted_locations = sorted(location_weights.items(), key=lambda x: len(x[1]), reverse=True)
    
    recommended_seats = []
    
    # Process sorted locations to find the closest AVAILABLE seats
    for (floor, zone), seat_numbers in sorted_locations:
        if len(recommended_seats) >= limit:
            break
            
        # Get all AVAILABLE seats in this floor & zone
        available_seats = db.query(models.Seat).filter(
            models.Seat.floor == floor,
            models.Seat.zone == zone,
            models.Seat.status == "AVAILABLE"
        ).all()
        
        if not available_seats:
            continue
            
        # For each available seat, compute the minimum distance to any teammate
        def get_min_dist(seat):
            return min(abs(seat.number - tn) for tn in seat_numbers)
            
        # Sort available seats by their proximity to teammates
        sorted_avail = sorted(available_seats, key=get_min_dist)
        
        # Add to recommended list
        for seat in sorted_avail:
            if len(recommended_seats) >= limit:
                break
            if seat not in recommended_seats:
                recommended_seats.append(seat)
                
    # If we still haven't found enough recommendations, fill up with any available seats
    if len(recommended_seats) < limit:
        remaining_seats = db.query(models.Seat).filter(
            models.Seat.status == "AVAILABLE"
        ).filter(~models.Seat.id.in_([s.id for s in recommended_seats])).limit(limit - len(recommended_seats)).all()
        recommended_seats.extend(remaining_seats)
        
    return recommended_seats[:limit]
