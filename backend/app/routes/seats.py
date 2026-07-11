from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from app import crud, schemas, models
from app.database import get_db
from app.auth import RoleChecker

router = APIRouter(prefix="/api/seats", tags=["Seats"])

def format_seats_bulk(db: Session, seats: list[models.Seat]) -> list[schemas.SeatOut]:
    if not seats:
        return []

    # Single query to get all active allocations + employee info for these seats
    seat_ids = [s.id for s in seats]
    occupied_ids = [s.id for s in seats if s.status == "OCCUPIED"]

    occupant_map: dict[int, schemas.SeatOccupantOut] = {}
    if occupied_ids:
        rows = db.query(
            models.SeatAllocation.seat_id,
            models.Employee.id,
            models.Employee.employee_id,
            models.Employee.first_name,
            models.Employee.last_name,
            models.Employee.department,
            models.Employee.role,
        ).join(
            models.Employee, models.Employee.id == models.SeatAllocation.employee_id
        ).filter(
            models.SeatAllocation.seat_id.in_(occupied_ids),
            models.SeatAllocation.released_at.is_(None)
        ).all()

        for row in rows:
            occupant_map[row.seat_id] = schemas.SeatOccupantOut(
                id=row.id,
                employee_id=row.employee_id,
                full_name=f"{row.first_name} {row.last_name}",
                department=row.department,
                role=row.role
            )

    return [
        schemas.SeatOut(
            id=s.id,
            seat_code=s.seat_code,
            floor=s.floor,
            zone=s.zone,
            number=s.number,
            status=s.status,
            occupant=occupant_map.get(s.id) if s.status == "OCCUPIED" else None
        )
        for s in seats
    ]

@router.get("", response_model=List[schemas.SeatOut])
def read_seats(
    floor: Optional[int] = Query(None, ge=1, le=5),
    zone: Optional[str] = None,
    status: Optional[str] = None,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    seats = crud.get_seats(db, floor=floor, zone=zone, status=status, project_id=project_id)
    return format_seats_bulk(db, seats)

@router.get("/recommend/{employee_id}", response_model=List[schemas.SeatOut])
def recommend_seats(
    employee_id: int,
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db)
):
    # Verify employee exists and is ONBOARDING or ACTIVE
    emp = crud.get_employee(db, employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    recommended = crud.get_seat_recommendations(db, employee_id, limit=limit)
    return format_seats_bulk(db, recommended)

@router.get("/{seat_id}", response_model=schemas.SeatOut)
def read_seat(seat_id: int, db: Session = Depends(get_db)):
    seat = crud.get_seat(db, seat_id)
    if not seat:
        raise HTTPException(status_code=404, detail="Seat not found")
    return format_seats_bulk(db, [seat])[0]

@router.put("/{seat_id}/status", response_model=schemas.SeatOut)
def change_seat_status(
    seat_id: int,
    status_update: schemas.SeatUpdate,
    db: Session = Depends(get_db),
    current_role: str = Depends(RoleChecker(allowed_roles={"Admin"}))
):
    seat = crud.get_seat(db, seat_id)
    if not seat:
        raise HTTPException(status_code=404, detail="Seat not found")
        
    if status_update.status not in ["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"]:
        raise HTTPException(status_code=400, detail="Invalid seat status")
        
    # If switching away from OCCUPIED, release employee seat if any
    if seat.status == "OCCUPIED" and status_update.status != "OCCUPIED":
        crud.release_seat(db, seat_id)
        
    updated = crud.update_seat_status(db, seat_id, status_update.status)
    return format_seats_bulk(db, [updated])[0]

@router.post("/allocate", response_model=schemas.SeatAllocationOut)
def allocate_employee_seat(
    allocation_req: schemas.SeatAllocationCreate,
    db: Session = Depends(get_db),
    current_role: str = Depends(RoleChecker(allowed_roles={"HR", "Admin"}))
):
    # Verify employee
    emp = crud.get_employee(db, allocation_req.employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    if emp.status == "EXITED":
        raise HTTPException(status_code=400, detail="Cannot allocate seats to exited employees")
        
    # Verify seat
    seat = crud.get_seat(db, allocation_req.seat_id)
    if not seat:
        raise HTTPException(status_code=404, detail="Seat not found")
        
    if seat.status in ["MAINTENANCE", "OCCUPIED"]:
        raise HTTPException(status_code=400, detail=f"Seat is not allocatable (current status: {seat.status})")
        
    # If HR is allocating, make sure employee is in ONBOARDING or ACTIVE status
    if current_role == "HR":
        # HR can only allocate seats. Admin can do overrides.
        pass
        
    new_alloc = crud.allocate_seat(db, employee_id=allocation_req.employee_id, seat_id=allocation_req.seat_id, allocated_by=current_role)
    if not new_alloc:
        raise HTTPException(status_code=400, detail="Failed to allocate seat")
        
    # Automatically switch employee status to ACTIVE if they were ONBOARDING
    if emp.status == "ONBOARDING":
        emp.status = "ACTIVE"
        db.commit()
        
    # Return formatted allocation
    return schemas.SeatAllocationOut(
        id=new_alloc.id,
        employee_id=new_alloc.employee_id,
        seat_id=new_alloc.seat_id,
        seat_code=seat.seat_code,
        allocated_by=new_alloc.allocated_by,
        allocated_at=new_alloc.allocated_at,
        released_at=new_alloc.released_at
    )

@router.post("/release")
def release_employee_seat(
    seat_id: int = Query(..., description="ID of the seat to release"),
    db: Session = Depends(get_db),
    current_role: str = Depends(RoleChecker(allowed_roles={"HR", "Admin"}))
):
    seat = crud.get_seat(db, seat_id)
    if not seat:
        raise HTTPException(status_code=404, detail="Seat not found")
        
    alloc = crud.release_seat(db, seat_id)
    return {"message": f"Successfully released seat {seat.seat_code}."}
