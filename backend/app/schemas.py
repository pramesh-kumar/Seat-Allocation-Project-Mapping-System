from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
import datetime

# --- Project Schemas ---
class ProjectBase(BaseModel):
    project_code: str = Field(..., description="Unique code for the project")
    name: str = Field(..., description="Name of the project")
    department: str = Field(..., description="Department managing the project")
    manager_name: Optional[str] = None
    start_date: datetime.date
    end_date: Optional[datetime.date] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    manager_name: Optional[str] = None
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None

class ProjectOut(ProjectBase):
    id: int

    class Config:
        from_attributes = True


# --- Employee Schemas ---
class EmployeeBase(BaseModel):
    employee_id: str
    first_name: str
    last_name: str
    email: str
    department: str
    role: str
    status: str = "ACTIVE"
    joining_date: Optional[datetime.date] = None

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    joining_date: Optional[datetime.date] = None

# Nested Project representation
class EmployeeProjectOut(BaseModel):
    project_id: int
    project_name: str
    project_code: str
    is_primary: bool

    class Config:
        from_attributes = True

# Outward Employee response, including seat allocation and project names
class EmployeeOut(EmployeeBase):
    id: int
    seat_code: Optional[str] = None
    projects: List[EmployeeProjectOut] = []
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


# --- Seat Schemas ---
class SeatBase(BaseModel):
    seat_code: str
    floor: int
    zone: str
    bay: int
    number: int
    status: str = "AVAILABLE"

class SeatCreate(SeatBase):
    pass

class SeatUpdate(BaseModel):
    status: Optional[str] = None

# Nested Seat Out including occupant
class SeatOccupantOut(BaseModel):
    id: int
    employee_id: str
    full_name: str
    department: str
    role: str

class SeatOut(SeatBase):
    id: int
    occupant: Optional[SeatOccupantOut] = None

    class Config:
        from_attributes = True


# --- Allocation Schemas ---
class SeatAllocationBase(BaseModel):
    employee_id: int
    seat_id: int

class SeatAllocationCreate(SeatAllocationBase):
    allocated_by: str = "SYSTEM"

class SeatAllocationOut(BaseModel):
    id: int
    employee_id: Optional[int]
    seat_id: int
    seat_code: str
    allocated_by: str
    allocated_at: datetime.datetime
    released_at: Optional[datetime.datetime]

    class Config:
        from_attributes = True


# --- Analytics Schemas ---
class FloorAnalytics(BaseModel):
    floor: int
    total_seats: int
    occupied_seats: int
    available_seats: int
    reserved_seats: int
    maintenance_seats: int
    occupancy_rate: float

class DepartmentAnalytics(BaseModel):
    department: str
    employee_count: int
    allocated_seats: int
    occupancy_rate: float

class OverallAnalytics(BaseModel):
    total_seats: int
    occupied_seats: int
    available_seats: int
    reserved_seats: int
    maintenance_seats: int
    overall_occupancy_rate: float
    total_employees: int
    active_employees: int
    onboarding_employees: int
    exited_employees: int
    by_floor: List[FloorAnalytics]
    by_department: List[DepartmentAnalytics]


# --- AI Chat Schemas ---
class AIQueryRequest(BaseModel):
    query: str

class AIQueryResponse(BaseModel):
    response_text: str
    intent: str
    entities: dict
    data: Optional[List[dict]] = None
