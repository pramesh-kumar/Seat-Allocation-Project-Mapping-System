from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("", response_model=schemas.OverallAnalytics)
def get_utilization_analytics(db: Session = Depends(get_db)):
    # 1. All seat counts in ONE query
    seat_counts = db.query(
        func.count(models.Seat.id).label("total"),
        func.sum(case((models.Seat.status == "OCCUPIED", 1), else_=0)).label("occupied"),
        func.sum(case((models.Seat.status == "AVAILABLE", 1), else_=0)).label("available"),
        func.sum(case((models.Seat.status == "RESERVED", 1), else_=0)).label("reserved"),
        func.sum(case((models.Seat.status == "MAINTENANCE", 1), else_=0)).label("maintenance"),
    ).one()

    total_seats = seat_counts.total or 0
    occupied_seats = int(seat_counts.occupied or 0)
    available_seats = int(seat_counts.available or 0)
    reserved_seats = int(seat_counts.reserved or 0)
    maintenance_seats = int(seat_counts.maintenance or 0)
    overall_occupancy_rate = round((occupied_seats / total_seats * 100), 2) if total_seats > 0 else 0.0

    # 2. All employee counts in ONE query
    emp_counts = db.query(
        func.count(models.Employee.id).label("total"),
        func.sum(case((models.Employee.status == "ACTIVE", 1), else_=0)).label("active"),
        func.sum(case((models.Employee.status == "ONBOARDING", 1), else_=0)).label("onboarding"),
        func.sum(case((models.Employee.status == "EXITED", 1), else_=0)).label("exited"),
    ).one()

    # 3. All floor stats in ONE query
    floor_rows = db.query(
        models.Seat.floor,
        func.count(models.Seat.id).label("total"),
        func.sum(case((models.Seat.status == "OCCUPIED", 1), else_=0)).label("occupied"),
        func.sum(case((models.Seat.status == "AVAILABLE", 1), else_=0)).label("available"),
        func.sum(case((models.Seat.status == "RESERVED", 1), else_=0)).label("reserved"),
        func.sum(case((models.Seat.status == "MAINTENANCE", 1), else_=0)).label("maintenance"),
    ).group_by(models.Seat.floor).order_by(models.Seat.floor).all()

    floor_stats = [
        schemas.FloorAnalytics(
            floor=r.floor,
            total_seats=r.total,
            occupied_seats=int(r.occupied or 0),
            available_seats=int(r.available or 0),
            reserved_seats=int(r.reserved or 0),
            maintenance_seats=int(r.maintenance or 0),
            occupancy_rate=round((int(r.occupied or 0) / r.total * 100), 2) if r.total > 0 else 0.0
        ) for r in floor_rows
    ]

    # 4. All department stats in TWO queries (emp count + allocation count)
    dept_emp_rows = db.query(
        models.Employee.department,
        func.count(models.Employee.id).label("emp_count")
    ).group_by(models.Employee.department).all()

    dept_alloc_rows = db.query(
        models.Employee.department,
        func.count(models.SeatAllocation.id).label("alloc_count")
    ).join(models.SeatAllocation, models.SeatAllocation.employee_id == models.Employee.id)\
     .filter(models.SeatAllocation.released_at.is_(None))\
     .group_by(models.Employee.department).all()

    alloc_by_dept = {r.department: r.alloc_count for r in dept_alloc_rows}

    dept_stats = [
        schemas.DepartmentAnalytics(
            department=r.department,
            employee_count=r.emp_count,
            allocated_seats=alloc_by_dept.get(r.department, 0),
            occupancy_rate=round((alloc_by_dept.get(r.department, 0) / r.emp_count * 100), 2) if r.emp_count > 0 else 0.0
        ) for r in dept_emp_rows if r.department
    ]

    return schemas.OverallAnalytics(
        total_seats=total_seats,
        occupied_seats=occupied_seats,
        available_seats=available_seats,
        reserved_seats=reserved_seats,
        maintenance_seats=maintenance_seats,
        overall_occupancy_rate=overall_occupancy_rate,
        total_employees=int(emp_counts.total or 0),
        active_employees=int(emp_counts.active or 0),
        onboarding_employees=int(emp_counts.onboarding or 0),
        exited_employees=int(emp_counts.exited or 0),
        by_floor=floor_stats,
        by_department=dept_stats
    )
