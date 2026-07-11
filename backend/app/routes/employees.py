from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app import crud, schemas, models
from app.database import get_db
from app.auth import RoleChecker

router = APIRouter(prefix="/api/employees", tags=["Employees"])

# Helper to format employee DB model to EmployeeOut schema
def format_employee_out(db: Session, emp: models.Employee) -> schemas.EmployeeOut:
    # Find active seat allocation
    active_alloc = db.query(models.SeatAllocation).filter(
        models.SeatAllocation.employee_id == emp.id,
        models.SeatAllocation.released_at.is_(None)
    ).first()
    
    seat_code = None
    if active_alloc:
        seat = db.query(models.Seat).filter(models.Seat.id == active_alloc.seat_id).first()
        if seat:
            seat_code = seat.seat_code
            
    # Format projects
    projects = []
    for mapping in emp.project_mappings:
        proj = db.query(models.Project).filter(models.Project.id == mapping.project_id).first()
        if proj:
            projects.append(schemas.EmployeeProjectOut(
                project_id=proj.id,
                project_name=proj.name,
                project_code=proj.project_code,
                is_primary=mapping.is_primary
            ))
            
    return schemas.EmployeeOut(
        id=emp.id,
        employee_id=emp.employee_id,
        first_name=emp.first_name,
        last_name=emp.last_name,
        email=emp.email,
        department=emp.department,
        role=emp.role,
        status=emp.status,
        seat_code=seat_code,
        projects=projects
    )

@router.get("", response_model=dict)
def read_employees(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    emps = crud.get_employees(db, skip=skip, limit=limit, search=search, department=department, status=status, project_id=project_id)
    total = crud.get_employees_count(db, search=search, department=department, status=status, project_id=project_id)
    
    formatted_emps = [format_employee_out(db, emp) for emp in emps]
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "data": formatted_emps
    }

@router.get("/{employee_id}", response_model=schemas.EmployeeOut)
def read_employee(employee_id: int, db: Session = Depends(get_db)):
    db_employee = crud.get_employee(db, employee_id)
    if db_employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    return format_employee_out(db, db_employee)

@router.post("", response_model=schemas.EmployeeOut, status_code=status.HTTP_201_CREATED)
def create_employee(
    employee: schemas.EmployeeCreate,
    db: Session = Depends(get_db),
    current_role: str = Depends(RoleChecker(allowed_roles={"HR", "Admin"}))
):
    # Check for existing email/ID
    if crud.get_employee_by_code(db, employee.employee_id):
        raise HTTPException(status_code=400, detail="Employee ID already registered")
    if crud.get_employee_by_email(db, employee.email):
        raise HTTPException(status_code=400, detail="Email already registered")
        
    db_employee = crud.create_employee(db, employee)
    return format_employee_out(db, db_employee)

@router.put("/{employee_id}", response_model=schemas.EmployeeOut)
def update_employee(
    employee_id: int,
    employee_update: schemas.EmployeeUpdate,
    db: Session = Depends(get_db),
    current_role: str = Depends(RoleChecker(allowed_roles={"HR", "Admin"}))
):
    db_employee = crud.get_employee(db, employee_id)
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    # Check if status changed to EXITED, release their seat automatically
    if employee_update.status == "EXITED" and db_employee.status != "EXITED":
        # Find active allocation
        active_alloc = db.query(models.SeatAllocation).filter(
            models.SeatAllocation.employee_id == employee_id,
            models.SeatAllocation.released_at.is_(None)
        ).first()
        if active_alloc:
            crud.release_seat(db, active_alloc.seat_id)
            
    updated_emp = crud.update_employee(db, employee_id, employee_update)
    return format_employee_out(db, updated_emp)

@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_role: str = Depends(RoleChecker(allowed_roles={"Admin"}))
):
    success = crud.delete_employee(db, employee_id)
    if not success:
        raise HTTPException(status_code=404, detail="Employee not found")
    return None
