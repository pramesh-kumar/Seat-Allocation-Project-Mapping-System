import datetime
from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    department = Column(String, index=True, nullable=False)
    role = Column(String, nullable=False)
    status = Column(String, default="ACTIVE", index=True, nullable=False)  # ACTIVE, ONBOARDING, EXITED

    # Relationships
    project_mappings = relationship("EmployeeProject", back_populates="employee", cascade="all, delete-orphan")
    allocations = relationship("SeatAllocation", back_populates="employee")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    project_code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, index=True, nullable=False)
    department = Column(String, index=True, nullable=False)
    manager_name = Column(String, nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)

    # Relationships
    employee_mappings = relationship("EmployeeProject", back_populates="project", cascade="all, delete-orphan")


class EmployeeProject(Base):
    __tablename__ = "employee_projects"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    is_primary = Column(Boolean, default=True, nullable=False)

    # Constraints
    __table_args__ = (
        UniqueConstraint('employee_id', 'project_id', name='_employee_project_uc'),
    )

    # Relationships
    employee = relationship("Employee", back_populates="project_mappings")
    project = relationship("Project", back_populates="employee_mappings")


class Seat(Base):
    __tablename__ = "seats"

    id = Column(Integer, primary_key=True, index=True)
    seat_code = Column(String, unique=True, index=True, nullable=False)  # e.g., FL1-Z-A-S005
    floor = Column(Integer, index=True, nullable=False)  # 1 to 5
    zone = Column(String, index=True, nullable=False)   # A, B, C, D
    number = Column(Integer, nullable=False)            # 1 to 250
    status = Column(String, default="AVAILABLE", index=True, nullable=False)  # AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE

    # Relationships
    allocations = relationship("SeatAllocation", back_populates="seat")


class SeatAllocation(Base):
    __tablename__ = "seat_allocations"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    seat_id = Column(Integer, ForeignKey("seats.id", ondelete="CASCADE"), nullable=False)
    allocated_by = Column(String, default="SYSTEM", nullable=False)  # HR, ADMIN, SYSTEM
    allocated_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    released_at = Column(DateTime, nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="allocations")
    seat = relationship("Seat", back_populates="allocations")
