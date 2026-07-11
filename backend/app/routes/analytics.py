from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("", response_model=schemas.OverallAnalytics)
def get_utilization_analytics(db: Session = Depends(get_db)):
    # 1. Total Seating Metrics
    total_seats = db.query(models.Seat).count()
    
    occupied_seats = db.query(models.Seat).filter(models.Seat.status == "OCCUPIED").count()
    available_seats = db.query(models.Seat).filter(models.Seat.status == "AVAILABLE").count()
    reserved_seats = db.query(models.Seat).filter(models.Seat.status == "RESERVED").count()
    maintenance_seats = db.query(models.Seat).filter(models.Seat.status == "MAINTENANCE").count()
    
    overall_occupancy_rate = round((occupied_seats / total_seats * 100), 2) if total_seats > 0 else 0.0

    # 2. Employee Metrics
    total_employees = db.query(models.Employee).count()
    active_employees = db.query(models.Employee).filter(models.Employee.status == "ACTIVE").count()
    onboarding_employees = db.query(models.Employee).filter(models.Employee.status == "ONBOARDING").count()
    exited_employees = db.query(models.Employee).filter(models.Employee.status == "EXITED").count()

    # 3. Floor-by-Floor Metrics
    floor_stats = []
    # Floors 1 to 5
    for floor in range(1, 6):
        f_total = db.query(models.Seat).filter(models.Seat.floor == floor).count()
        f_occ = db.query(models.Seat).filter(models.Seat.floor == floor, models.Seat.status == "OCCUPIED").count()
        f_avail = db.query(models.Seat).filter(models.Seat.floor == floor, models.Seat.status == "AVAILABLE").count()
        f_res = db.query(models.Seat).filter(models.Seat.floor == floor, models.Seat.status == "RESERVED").count()
        f_maint = db.query(models.Seat).filter(models.Seat.floor == floor, models.Seat.status == "MAINTENANCE").count()
        
        f_rate = round((f_occ / f_total * 100), 2) if f_total > 0 else 0.0
        
        floor_stats.append(schemas.FloorAnalytics(
            floor=floor,
            total_seats=f_total,
            occupied_seats=f_occ,
            available_seats=f_avail,
            reserved_seats=f_res,
            maintenance_seats=f_maint,
            occupancy_rate=f_rate
        ))

    # 4. Department Metrics
    dept_stats = []
    # Get distinct departments from Employee table
    departments = db.query(models.Employee.department).distinct().all()
    departments = [d[0] for d in departments if d[0]]
    
    for dept in departments:
        # Total employees in department
        emp_count = db.query(models.Employee).filter(models.Employee.department == dept).count()
        
        # Total active seat allocations for department employees
        allocated_seats = db.query(models.SeatAllocation).join(models.Employee).filter(
            models.Employee.department == dept,
            models.SeatAllocation.released_at.is_(None)
        ).count()
        
        # Department utilization (allocated seats / total employees in dept)
        dept_rate = round((allocated_seats / emp_count * 100), 2) if emp_count > 0 else 0.0
        
        dept_stats.append(schemas.DepartmentAnalytics(
            department=dept,
            employee_count=emp_count,
            allocated_seats=allocated_seats,
            occupancy_rate=dept_rate
        ))

    return schemas.OverallAnalytics(
        total_seats=total_seats,
        occupied_seats=occupied_seats,
        available_seats=available_seats,
        reserved_seats=reserved_seats,
        maintenance_seats=maintenance_seats,
        overall_occupancy_rate=overall_occupancy_rate,
        total_employees=total_employees,
        active_employees=active_employees,
        onboarding_employees=onboarding_employees,
        exited_employees=exited_employees,
        by_floor=floor_stats,
        by_department=dept_stats
    )
